import { prisma } from "./db";
import { runVerifier } from "./verifiers/index";
import { aggregateAssessments, computeConsensusRewards, updateReputation } from "./aggregation";
import { signProof } from "./signing";
import { emit } from "./events";
import { recordVerdict } from "./market";
import { ROUTE_DEFINITIONS } from "./routes";
import { spawnChallengeFromTask } from "./arena";
import { openMarket, placeBet, closeMarket, resolveMarket } from "./prediction";
import type { VerifierContext } from "./verifiers/types";

export async function executeTrustTask(taskId: string) {
  const task = await prisma.trustTask.findUnique({
    where: { id: taskId },
    include: { quotes: { include: { routes: true } }, payments: true },
  });
  if (!task) throw new Error("Task not found");
  if (task.status !== "PAID") throw new Error("Task not paid");

  await prisma.trustTask.update({ where: { id: taskId }, data: { status: "IN_PROGRESS" } });

  const selectedRoute = task.quotes
    .flatMap((q) => q.routes)
    .find((r) => r.id === task.selectedRouteId || r.routeKey === task.selectedRouteId);

  if (!selectedRoute) throw new Error("Route not found");

  const routeDef = ROUTE_DEFINITIONS.find((d) => d.key === selectedRoute.routeKey);
  if (!routeDef) throw new Error("Route definition not found");

  // Route Zero: prediction market execution
  if (selectedRoute.routeKey === "route_zero") {
    return executePredictionMarketRoute(taskId, task, selectedRoute);
  }

  const ctx = {
    ...(JSON.parse(task.contextJson) as VerifierContext & Record<string, unknown>),
    category: task.category,
    claim: task.claim,
  } as VerifierContext & Record<string, unknown>;
  const sellerPlan = JSON.parse(selectedRoute.sellerPlanJson) as { key: string; costSats: number; reputation: number }[];

  // Get verifiers from DB — fetch all and filter in JS to avoid adapter quirks with `in`
  const allVerifiers = await prisma.verifier.findMany();
  const verifierByName = Object.fromEntries(allVerifiers.map((v) => [v.name, v]));
  const verifierById = Object.fromEntries(allVerifiers.map((v) => [v.id, v]));

  const agentKeys = routeDef.verifierKeys.filter((k) => !k.startsWith("human_"));
  const humanKeys = routeDef.verifierKeys.filter((k) => k.startsWith("human_"));

  // Run automated verifiers in parallel
  const agentPromises = agentKeys.map(async (key) => {
    const dbV = verifierByName[key];
    const plan = sellerPlan.find((s) => s.key === key);
    const result = await runVerifier(key, ctx as VerifierContext, dbV?.reputation ?? 0.75, plan?.costSats ?? 3);
    if (!result || !dbV) return null;

    emit(taskId, "verifier_started", { verifier: key });

    const assessment = await prisma.assessment.create({
      data: {
        taskId,
        verifierId: dbV.id,
        verdict: result.verdict,
        confidence: result.confidence,
        evidenceJson: JSON.stringify(result.evidence),
        latencyMs: result.latencyMs,
        costSats: result.costSats,
      },
    });

    emit(taskId, "assessment_submitted", {
      verifier: key,
      verdict: result.verdict,
      confidence: result.confidence,
      evidence: result.evidence,
    });

    return { ...result, verifierId: dbV.id, dbId: assessment.id };
  });

  const agentResults = (await Promise.all(agentPromises)).filter(Boolean);

  // Handle human reviewers
  const humanResults: typeof agentResults = [];
  if (humanKeys.length > 0) {
    await prisma.trustTask.update({ where: { id: taskId }, data: { status: "WAITING_FOR_HUMAN" } });
    emit(taskId, "human_review_requested", {
      reviewers: humanKeys,
      eta_seconds: 120,
      task_id: taskId,
    });

    // Wait for human assessments — 15s in mock/demo mode, 3 min in real mode
    const waitMs = process.env.DEMO_MODE === "real" ? 3 * 60 * 1000 : 15 * 1000;
    const timeout = Date.now() + waitMs;
    while (Date.now() < timeout) {
      const humanAssessments = await prisma.assessment.findMany({
        where: { taskId, verifier: { name: { startsWith: "human_reviewer" } } },
        include: { verifier: true },
      });
      if (humanAssessments.length >= humanKeys.length) {
        for (const ha of humanAssessments) {
          humanResults.push({
            verifierId: ha.verifierId,
            verifierType: "HUMAN",
            verdict: ha.verdict as "safe" | "suspicious" | "unsafe" | "unknown",
            confidence: ha.confidence,
            evidence: JSON.parse(ha.evidenceJson),
            latencyMs: ha.latencyMs,
            costSats: ha.costSats,
            reputation: ha.verifier.reputation,
            dbId: ha.id,
          });
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Fallback: simulate human if none submitted in time (demo mode)
    if (humanResults.length < humanKeys.length && process.env.DEMO_MODE !== "real") {
      const pending = humanKeys.slice(humanResults.length);
      for (const key of pending) {
        const dbV = verifierByName[key];
        if (!dbV) continue; // skip if verifier not in DB
        const plan = sellerPlan.find((s) => s.key === key);
        // Simulate based on agent consensus
        const agentVerdicts = agentResults.map((r) => r?.verdict);
        const unsafeCount = agentVerdicts.filter((v) => v === "unsafe" || v === "suspicious").length;
        const simVerdict = unsafeCount > agentVerdicts.length / 2 ? "unsafe" : "safe";

        const ha = await prisma.assessment.create({
          data: {
            taskId,
            verifierId: dbV.id,
            verdict: simVerdict,
            confidence: 0.88,
            evidenceJson: JSON.stringify(["[Simulated reviewer: auto-submitted based on agent consensus]"]),
            latencyMs: 5000,
            costSats: plan?.costSats ?? 15,
          },
        });

        humanResults.push({
          verifierId: dbV.id,
          verifierType: "HUMAN",
          verdict: simVerdict as "safe" | "suspicious" | "unsafe" | "unknown",
          confidence: 0.88,
          evidence: ["[Simulated reviewer: auto-submitted based on agent consensus]"],
          latencyMs: 5000,
          costSats: plan?.costSats ?? 15,
          reputation: dbV?.reputation ?? 0.85,
          dbId: ha.id,
        });

        emit(taskId, "assessment_submitted", {
          verifier: key,
          verdict: simVerdict,
          confidence: 0.88,
          simulated: true,
        });
      }
    }
  }

  await prisma.trustTask.update({ where: { id: taskId }, data: { status: "IN_PROGRESS" } });

  const allResults = [...agentResults, ...humanResults].filter(Boolean) as NonNullable<(typeof agentResults)[0]>[];

  // Aggregate
  const { verdict, confidence, evidence, disagreement, explanation, consensus } = aggregateAssessments(
    allResults,
    routeDef.maxConfidenceCap
  );

  // Generate trust proof
  const payment = task.payments[0];
  const platformFeeSats = Math.max(2, Math.ceil(selectedRoute.priceSats * 0.15));
  const rewardPoolSats = Math.max(0, selectedRoute.priceSats - platformFeeSats);
  const rewardAllocations = computeConsensusRewards(allResults, verdict, rewardPoolSats, consensus.consensusFinality);
  const proofData = {
    proof_id: `proof_${taskId}`,
    version: "trust402.v1",
    claim: task.claim,
    category: task.category,
    verdict,
    confidence,
    confidence_explanation: explanation,
    evidence,
    consensus: {
      state: consensus.state,
      quorum_reached: consensus.quorumReached,
      finality: consensus.consensusFinality,
      weighted_score: consensus.weightedScore,
      agreement_factor: consensus.agreementFactor,
      disagreement_index: consensus.disagreementIndex,
      uncertainty: consensus.uncertainty,
      economic_thesis: "Consensus compresses cost; uncertainty expands cost.",
    },
    route: {
      route_id: selectedRoute.routeKey,
      label: selectedRoute.label,
      market_price_sats: selectedRoute.priceSats,
      expected_confidence: selectedRoute.expectedConfidence,
    },
    assessments: allResults.map((r) => ({
      verifier_id: r.verifierId,
      verifier_name: verifierById[r.verifierId]?.name ?? r.verifierId,
      verifier_type: r.verifierType,
      verdict: r.verdict,
      confidence: r.confidence,
      evidence: r.evidence,
      reputation_at_time: r.reputation,
    })),
    payment: {
      network: "lightning",
      amount_sats: payment?.amountSats ?? selectedRoute.priceSats,
      receipt: payment?.receiptJson ?? undefined,
    },
    platform_fee_sats: platformFeeSats,
    reward_mechanism: {
      model: "weighted action consensus",
      reward_rule: "base participation payout plus bonus for evidence-backed alignment with final consensus",
      pricing_rule: "price is the market cost of uncertainty; prior consensus compresses cost, novelty expands it",
      reward_pool_sats: rewardPoolSats,
    },
    created_at: new Date().toISOString(),
    issuer_public_key: process.env.TRUST402_SIGNING_PUBLIC_KEY ?? "",
  };

  const { signature } = signProof(proofData as Record<string, unknown>);

  // Compute payouts
  const payouts = rewardAllocations.map((allocation) => ({
    verifierId: allocation.verifierId,
    taskId,
    amountSats: allocation.totalSats,
    status: "PAID",
    paidAt: new Date(),
  }));

  await prisma.trustProof.create({
    data: {
      taskId,
      verdict,
      confidence,
      evidenceJson: JSON.stringify(evidence),
      proofJson: JSON.stringify({ ...proofData, signature }),
      signature,
    },
  });

  for (const p of payouts) {
    await prisma.payout.create({ data: p });
  }

  await prisma.trustTask.update({
    where: { id: taskId },
    data: { status: "COMPLETED", finalVerdict: verdict, finalConfidence: confidence },
  });

  await prisma.marketEvent.create({
    data: {
      type: disagreement ? "disagreement_detected" : "task_completed",
      category: task.category,
      taskId,
      payloadJson: JSON.stringify({
        verdict,
        confidence,
        priceSats: selectedRoute.priceSats,
        consensus_finality: consensus.consensusFinality,
        uncertainty: consensus.uncertainty,
      }),
    },
  });

  recordVerdict(task.category, verdict, selectedRoute.priceSats, {
    disagreement,
    consensusFinality: consensus.consensusFinality,
  });

  // Update reputations
  for (const r of allResults) {
    const dbV = verifierById[r.verifierId];
    if (dbV) {
      const newRep = updateReputation(dbV.reputation, r, verdict, r.latencyMs, task.deadlineSeconds * 1000);
      await prisma.verifier.update({ where: { id: dbV.id }, data: { reputation: newRep } });
    }
  }

  // Emit payouts
  for (const allocation of rewardAllocations) {
    emit(taskId, "seller_payout", {
      seller_id: allocation.verifierId,
      seller_name: verifierById[allocation.verifierId]?.name ?? allocation.verifierId,
      paid_sats: allocation.totalSats,
      bonus_sats: allocation.bonusSats,
      aligned: allocation.aligned,
    });
  }

  emit(taskId, "proof_ready", {
    proof_id: `proof_${taskId}`,
    verdict,
    confidence,
    consensus_state: consensus.state,
    finality: consensus.consensusFinality,
  });

  // Spawn arena challenge from this completed task (non-blocking)
  try {
    const existing = await prisma.arenaChallenge.findFirst({ where: { sourceTaskId: taskId } });
    if (!existing) {
      await spawnChallengeFromTask(taskId);
    }
  } catch (e) {
    console.error("Arena challenge spawn failed (non-critical):", e);
  }

  return { verdict, confidence, proofId: `proof_${taskId}` };
}

/**
 * Execute Route Zero: prediction market route.
 * Opens a 10s betting window, auto-places fixture bets, aggregates, generates proof.
 */
async function executePredictionMarketRoute(
  taskId: string,
  task: { claim: string; category: string; contextJson: string; payments: { amountSats: number; receiptJson: string | null }[] },
  selectedRoute: { routeKey: string; label: string; priceSats: number; expectedConfidence: number }
) {
  const MARKET_DURATION_MS = 10000;

  // Open market
  await openMarket(taskId, MARKET_DURATION_MS);

  // Auto-place bets from fixture agents to ensure demo has activity
  const fixtureAgents = await prisma.verifier.findMany({ where: { type: { not: "HUMAN" } }, take: 8 });
  const ctx = JSON.parse(task.contextJson) as Record<string, unknown>;
  const url = (ctx.url as string) ?? "";
  const isSuspicious = url.includes("example") || url.includes("discount") || url.includes("fast-auth");

  // Stagger bets over the market window
  for (let i = 0; i < fixtureAgents.length; i++) {
    const agent = fixtureAgents[i];
    const delay = 800 + i * 900 + Math.random() * 400;

    setTimeout(async () => {
      // Agents with higher reputation are more likely to be correct
      const correctProb = 0.5 + agent.reputation * 0.4;
      const isCorrect = Math.random() < correctProb;
      const likelyVerdict = isSuspicious ? "unsafe" : "safe";
      const verdict = isCorrect ? likelyVerdict : (likelyVerdict === "unsafe" ? "safe" : "unsafe");
      const sats = Math.min(5, Math.max(1, Math.round(agent.reputation * 4)));

      await placeBet(taskId, agent.id, agent.name, verdict, sats);
    }, delay);
  }

  // Wait for market to close
  await new Promise((r) => setTimeout(r, MARKET_DURATION_MS + 1500));

  // Close and aggregate
  const result = closeMarket(taskId);
  if (!result) throw new Error("Failed to close prediction market");

  const verdict = result.aggregatedVerdict as "safe" | "suspicious" | "unsafe" | "unknown";
  const confidence = result.confidence;

  emit(taskId, "prediction_market_closed", {
    verdict,
    confidence,
    distribution: result.distribution,
    total_pool_sats: result.totalPoolSats,
    position_count: result.positionCount,
  });

  // Resolve market
  await resolveMarket(taskId, verdict);

  // Generate proof
  const payment = task.payments[0];
  const platformFeeSats = Math.max(2, Math.ceil(selectedRoute.priceSats * 0.15));

  const proofData = {
    proof_id: `proof_${taskId}`,
    version: "trust402.v1",
    claim: task.claim,
    category: task.category,
    verdict,
    confidence,
    confidence_explanation: `Route Zero: ${result.positionCount} bets, ${result.totalPoolSats} sats total pool, distribution: ${JSON.stringify(result.distribution)}`,
    evidence: [
      `Prediction market aggregated ${result.positionCount} micro-bets`,
      `Total pool: ${result.totalPoolSats} sats`,
      `Verdict distribution: ${Object.entries(result.distribution).map(([k, v]) => `${k}: ${v} sats`).join(", ")}`,
      `Market consensus: ${verdict} at ${Math.round(confidence * 100)}% confidence`,
    ],
    consensus: {
      state: verdict === "safe" ? "allow" : verdict === "unsafe" ? "block" : "escalate",
      quorum_reached: result.positionCount >= 3,
      finality: confidence,
      weighted_score: confidence * (verdict === "unsafe" ? -1 : 1),
      agreement_factor: confidence,
      disagreement_index: 1 - confidence,
      uncertainty: 1 - confidence,
      economic_thesis: "Price discovery via micro-bets. The crowd prices trust faster than expert verification.",
    },
    route: {
      route_id: selectedRoute.routeKey,
      label: selectedRoute.label,
      market_price_sats: selectedRoute.priceSats,
      expected_confidence: selectedRoute.expectedConfidence,
    },
    assessments: [], // No traditional verifier assessments for Route Zero
    prediction_market: {
      positions: result.positionCount,
      total_pool_sats: result.totalPoolSats,
      distribution: result.distribution,
    },
    payment: {
      network: "lightning",
      amount_sats: payment?.amountSats ?? selectedRoute.priceSats,
      receipt: payment?.receiptJson ?? undefined,
    },
    platform_fee_sats: platformFeeSats,
    reward_mechanism: {
      model: "prediction market",
      reward_rule: "Winners split losers' sats proportionally",
      pricing_rule: "Price = aggregate micro-bet signal; cheapest trust route possible",
      reward_pool_sats: result.totalPoolSats,
    },
    created_at: new Date().toISOString(),
    issuer_public_key: process.env.TRUST402_SIGNING_PUBLIC_KEY ?? "",
  };

  const { signature } = signProof(proofData as Record<string, unknown>);

  await prisma.trustProof.create({
    data: {
      taskId,
      verdict,
      confidence,
      evidenceJson: JSON.stringify(proofData.evidence),
      proofJson: JSON.stringify({ ...proofData, signature }),
      signature,
    },
  });

  await prisma.trustTask.update({
    where: { id: taskId },
    data: { status: "COMPLETED", finalVerdict: verdict, finalConfidence: confidence },
  });

  await prisma.marketEvent.create({
    data: {
      type: "prediction_market_resolved",
      category: task.category,
      taskId,
      payloadJson: JSON.stringify({
        verdict,
        confidence,
        pool_sats: result.totalPoolSats,
        positions: result.positionCount,
      }),
    },
  });

  recordVerdict(task.category, verdict, selectedRoute.priceSats, {
    disagreement: false,
    consensusFinality: confidence,
  });

  emit(taskId, "proof_ready", {
    proof_id: `proof_${taskId}`,
    verdict,
    confidence,
    consensus_state: verdict === "safe" ? "allow" : "block",
    finality: confidence,
    route: "route_zero",
  });

  // Spawn arena challenge
  try {
    const existing = await prisma.arenaChallenge.findFirst({ where: { sourceTaskId: taskId } });
    if (!existing) {
      await spawnChallengeFromTask(taskId);
    }
  } catch (e) {
    console.error("Arena challenge spawn failed (non-critical):", e);
  }

  return { verdict, confidence, proofId: `proof_${taskId}` };
}
