import { prisma } from "@/lib/db";
import { emitGlobal } from "@/lib/events";
import { submitArenaResult } from "@/lib/arena";
import { runVerifier, type VerifierResult } from "@/lib/verifiers";
import { SERVICE_AGENT_DEFINITIONS } from "@/lib/verifiers/registry";
import type { VerifierContext } from "@/lib/verifiers/types";
import { getMarketState, recordArenaRound } from "@/lib/market";
import { aggregateAssessments } from "@/lib/aggregation";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldAttempt(agent: { type: string; categories: string[] }, category: string) {
  if (!agent.categories.includes(category)) {
    return { attempt: false, reason: `Role does not cover ${category}` };
  }

  if (agent.type === "TOOL_AGENT") {
    return { attempt: true, reason: "Tool agent has a direct signal for this category" };
  }

  return { attempt: true, reason: "Specialist agent accepts because the challenge matches its domain" };
}

async function callAgentOverHttp(
  agent: { key: string; port: number },
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<{ result: VerifierResult | null; transport: "http" | "fallback"; error?: string }> {
  try {
    const res = await fetch(`http://127.0.0.1:${agent.port}/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verifierKey: agent.key,
        ctx,
        reputation,
        costSats,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (res.ok) {
      return { result: await res.json() as VerifierResult, transport: "http" };
    }

    return { result: null, transport: "http", error: await res.text() };
  } catch (error) {
    return { result: null, transport: "http", error: String(error) };
  }
}

function evidenceWeight(evidence: string[]) {
  return Math.min(1.4, 0.8 + evidence.length * 0.15);
}

function speedWeight(latencyMs: number) {
  if (latencyMs < 2500) return 1.2;
  if (latencyMs < 6000) return 1.0;
  return 0.85;
}

function allocateWeightedPayouts(weights: number[], poolSats: number) {
  if (weights.length === 0 || poolSats <= 0) return weights.map(() => 0);

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || weights.length;
  const rawPayouts = weights.map((weight) => (weight / totalWeight) * poolSats);
  const payouts = rawPayouts.map(Math.floor);
  let remaining = poolSats - payouts.reduce((sum, payout) => sum + payout, 0);

  const byRemainder = rawPayouts
    .map((raw, index) => ({ index, remainder: raw - Math.floor(raw) }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; remaining > 0; i += 1) {
    payouts[byRemainder[i % byRemainder.length].index] += 1;
    remaining -= 1;
  }

  return payouts;
}

export async function POST(_req: Request, { params }: { params: Promise<{ challengeId: string }> }) {
  try {
    const { challengeId } = await params;
    const challenge = await prisma.arenaChallenge.findUnique({ where: { id: challengeId } });

    if (!challenge) {
      return Response.json({ error: "Challenge not found" }, { status: 404 });
    }

    const context = JSON.parse(challenge.contextJson) as VerifierContext;
    const dbVerifiers = await prisma.verifier.findMany();
    const verifierByName = Object.fromEntries(dbVerifiers.map((verifier) => [verifier.name, verifier]));
    const marketBefore = getMarketState(challenge.category);

    emitGlobal("arena_challenge_published", {
      challenge_id: challenge.id,
      category: challenge.category,
      claim: challenge.claim,
      agent_count: SERVICE_AGENT_DEFINITIONS.length,
    });

    const jobs = SERVICE_AGENT_DEFINITIONS.map(async (agent, index) => {
      await wait(350 + index * 450);
      const dbVerifier = verifierByName[agent.key];

      emitGlobal("arena_agent_heard_challenge", {
        challenge_id: challenge.id,
        agent_key: agent.key,
        agent_label: agent.label,
        agent_type: agent.type,
      });

      const decision = shouldAttempt(agent, challenge.category);
      emitGlobal("arena_agent_decision", {
        challenge_id: challenge.id,
        agent_key: agent.key,
        agent_label: agent.label,
        attempt: decision.attempt,
        reason: decision.reason,
      });

      if (!decision.attempt || !dbVerifier) return null;

      await wait(700 + index * 180);
      emitGlobal("arena_agent_solving", {
        challenge_id: challenge.id,
        agent_key: agent.key,
        agent_label: agent.label,
        mode: process.env.OPENAI_API_KEY && process.env.OPENAI_VERIFIER_MODE !== "off" ? "openai" : "fixture",
        transport: "http",
      });

      const started = Date.now();
      const verifierContext = {
        ...context,
        category: challenge.category,
        claim: challenge.claim,
      };
      let transport: "http" | "fallback" = "http";
      const httpAttempt = await callAgentOverHttp(
        agent,
        verifierContext,
        dbVerifier.reputation,
        dbVerifier.minPriceSats
      );
      let assessment = httpAttempt.result;
      const httpError = httpAttempt.error;

      if (!assessment && process.env.ARENA_HTTP_FALLBACK !== "off") {
        emitGlobal("arena_agent_transport_fallback", {
          challenge_id: challenge.id,
          agent_key: agent.key,
          agent_label: agent.label,
          error: httpError,
        });
        transport = "fallback";
        assessment = await runVerifier(
          agent.key,
          verifierContext,
          dbVerifier.reputation,
          dbVerifier.minPriceSats
        );
      }

      if (!assessment) {
        emitGlobal("arena_agent_error", {
          challenge_id: challenge.id,
          agent_key: agent.key,
          agent_label: agent.label,
          error: httpError ?? "No verifier result",
        });
        return null;
      }

      const latencyMs = Date.now() - started;
      const result = await submitArenaResult(
        challenge.id,
        dbVerifier.id,
        assessment.verdict,
        assessment.confidence,
        assessment.evidence,
        latencyMs,
        { completeChallenge: false }
      );

      emitGlobal("arena_agent_submitted", {
        challenge_id: challenge.id,
        agent_key: agent.key,
        agent_label: agent.label,
        verdict: assessment.verdict,
        confidence: assessment.confidence,
        evidence: assessment.evidence.slice(0, 3),
        transport,
        correct: result.correct,
        score_awarded: result.score_awarded,
        reward_sats: 0,
        stake_sats: challenge.stakeSats,
      });

      return { result, assessment, verifierId: dbVerifier.id, latencyMs };
    });

    const outcomes = (await Promise.all(jobs)).filter(Boolean) as {
      result: Awaited<ReturnType<typeof submitArenaResult>>;
      assessment: VerifierResult;
      verifierId: string;
      latencyMs: number;
    }[];
    const correctCount = outcomes.filter((outcome) => outcome.result.correct).length;
    const verdictSet = new Set(outcomes.map((outcome) => outcome.assessment.verdict));
    const disagreement = verdictSet.size > 1;
    const consensus = aggregateAssessments(outcomes.map((outcome) => outcome.assessment), 0.92);
    const alignedOutcomes = outcomes.filter((outcome) => outcome.assessment.verdict === consensus.verdict);
    const slashedSats = outcomes.filter((outcome) => outcome.assessment.verdict !== consensus.verdict).length * challenge.stakeSats;
    const rewardPoolSats = challenge.escrowSats + slashedSats;
    const weights = alignedOutcomes.map((outcome) => (
      outcome.assessment.reputation *
      outcome.assessment.confidence *
      evidenceWeight(outcome.assessment.evidence) *
      speedWeight(outcome.latencyMs)
    ));
    const payouts = allocateWeightedPayouts(weights, rewardPoolSats);
    const payoutByVerifier = new Map<string, number>();

    alignedOutcomes.forEach((outcome, index) => {
      payoutByVerifier.set(outcome.verifierId, payouts[index]);
    });
    const totalRewardSats = Array.from(payoutByVerifier.values()).reduce((sum, payout) => sum + payout, 0);

    for (const outcome of outcomes) {
      const rewardSats = payoutByVerifier.get(outcome.verifierId) ?? 0;
      if (rewardSats > 0) {
        await prisma.payout.create({
          data: {
            verifierId: outcome.verifierId,
            taskId: challenge.id,
            amountSats: rewardSats,
            status: "PAID",
            paidAt: new Date(),
          },
        });
      }
    }

    await prisma.arenaChallenge.update({
      where: { id: challenge.id },
      data: { slashedSats, status: "COMPLETED" },
    });

    recordArenaRound(challenge.category, {
      totalRewardSats,
      correctCount,
      submissionCount: outcomes.length,
      disagreement,
    });

    const marketAfter = getMarketState(challenge.category);
    await prisma.marketEvent.create({
      data: {
        type: "arena_round_resolved",
        category: challenge.category,
        taskId: challenge.sourceTaskId,
        payloadJson: JSON.stringify({
          challenge_id: challenge.id,
          submissions: outcomes.length,
          correct_count: correctCount,
          consensus_verdict: consensus.verdict,
          consensus_confidence: consensus.confidence,
          escrow_sats: challenge.escrowSats,
          stake_sats: challenge.stakeSats,
          slashed_sats: slashedSats,
          reward_pool_sats: rewardPoolSats,
          total_reward_sats: totalRewardSats,
          disagreement,
          price_before_sats: marketBefore.medianPriceSats,
          price_after_sats: marketAfter.medianPriceSats,
          consensus_before: marketBefore.priorConsensusStrength,
          consensus_after: marketAfter.priorConsensusStrength,
          novelty_before: marketBefore.noveltyScore,
          novelty_after: marketAfter.noveltyScore,
        }),
      },
    });

    emitGlobal("arena_round_resolved", {
      challenge_id: challenge.id,
      category: challenge.category,
      submissions: outcomes.length,
      correct_count: correctCount,
      consensus_verdict: consensus.verdict,
      consensus_confidence: consensus.confidence,
      escrow_sats: challenge.escrowSats,
      stake_sats: challenge.stakeSats,
      slashed_sats: slashedSats,
      reward_pool_sats: rewardPoolSats,
      total_reward_sats: totalRewardSats,
      disagreement,
      price_before_sats: marketBefore.medianPriceSats,
      price_after_sats: marketAfter.medianPriceSats,
      consensus_before: marketBefore.priorConsensusStrength,
      consensus_after: marketAfter.priorConsensusStrength,
    });

    return Response.json({
      challenge_id: challenge.id,
      status: "broadcast_completed",
      agents_notified: SERVICE_AGENT_DEFINITIONS.length,
      submissions: outcomes.length,
      consensus_verdict: consensus.verdict,
      consensus_confidence: consensus.confidence,
      escrow_sats: challenge.escrowSats,
      stake_sats: challenge.stakeSats,
      slashed_sats: slashedSats,
      reward_pool_sats: rewardPoolSats,
      total_reward_sats: totalRewardSats,
      price_before_sats: marketBefore.medianPriceSats,
      price_after_sats: marketAfter.medianPriceSats,
    });
  } catch (err) {
    console.error("Arena broadcast error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
