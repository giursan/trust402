import { prisma } from "@/lib/db";
import { aggregateAssessments } from "@/lib/aggregation";
import { getMarketState } from "@/lib/market";
import { emitGlobal } from "@/lib/events";

export async function GET() {
  try {
    const challenges = await prisma.arenaChallenge.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    });
    const challengeIds = challenges.map((challenge) => challenge.id);

    const results = await prisma.arenaResult.findMany({
      where: { challengeId: { in: challengeIds } },
      include: { verifier: true },
      orderBy: { createdAt: "asc" },
    });

    const payouts = await prisma.payout.groupBy({
      by: ["taskId"],
      where: { taskId: { in: challengeIds } },
      _sum: { amountSats: true },
    });
    const payoutByChallenge = Object.fromEntries(payouts.map((payout) => [payout.taskId, payout._sum.amountSats ?? 0]));

    const resultsByChallenge = new Map<string, typeof results>();
    for (const result of results) {
      const bucket = resultsByChallenge.get(result.challengeId) ?? [];
      bucket.push(result);
      resultsByChallenge.set(result.challengeId, bucket);
    }

    return Response.json({
      challenges: challenges.map((challenge) => {
        const challengeResults = resultsByChallenge.get(challenge.id) ?? [];
        const assessments = challengeResults.map((result) => ({
          verifierId: result.verifierId,
          verifierType: result.verifier.type as "TOOL_AGENT" | "SPECIALIST_AGENT" | "HUMAN",
          verdict: result.verdict as "safe" | "suspicious" | "unsafe" | "unknown",
          confidence: result.confidence,
          evidence: JSON.parse(result.evidenceJson),
          latencyMs: result.responseTimeMs,
          costSats: result.verifier.minPriceSats,
          reputation: result.verifier.reputation,
        }));
        const consensus = assessments.length > 0 ? aggregateAssessments(assessments, 0.92) : null;
        const market = getMarketState(challenge.category);

        return {
          id: challenge.id,
          source_task_id: challenge.sourceTaskId,
          category: challenge.category,
          claim: challenge.claim,
          context: JSON.parse(challenge.contextJson),
          difficulty: challenge.difficulty,
          is_honeypot: challenge.isHoneypot,
          status: challenge.status,
          result_count: challengeResults.length,
          reward_paid_sats: payoutByChallenge[challenge.id] ?? 0,
          escrow_sats: challenge.escrowSats,
          stake_sats: challenge.stakeSats,
          slashed_sats: challenge.slashedSats,
          market_price_sats: market.medianPriceSats,
          market_demand_level: market.demandLevel,
          consensus: consensus ? {
            verdict: consensus.verdict,
            confidence: consensus.confidence,
            finality: consensus.consensus.consensusFinality,
            disagreement: consensus.disagreement,
            state: consensus.consensus.state,
          } : null,
          results: challengeResults.map((result) => ({
            verifier_id: result.verifierId,
            verifier_name: result.verifier.name,
            verifier_type: result.verifier.type,
            verdict: result.verdict,
            confidence: result.confidence,
            correct: result.correct,
            score_awarded: result.scoreAwarded,
            evidence: JSON.parse(result.evidenceJson),
            created_at: result.createdAt,
          })),
          created_at: challenge.createdAt,
        };
      }),
    });
  } catch (err) {
    console.error("Arena challenges error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const category = body.category ?? "shopping_scam";
    const claim = body.claim;
    const context = body.context ?? {};

    if (!claim) {
      return Response.json({ error: "claim required" }, { status: 400 });
    }

    const challenge = await prisma.arenaChallenge.create({
      data: {
        sourceTaskId: body.source_task_id ?? null,
        category,
        claim,
        contextJson: JSON.stringify(context),
        knownVerdict: body.known_verdict ?? "unsafe",
        isHoneypot: Boolean(body.is_honeypot ?? false),
        difficulty: body.difficulty ?? "normal",
        escrowSats: body.escrow_sats ?? 40,
        stakeSats: body.stake_sats ?? 2,
        status: "OPEN",
      },
    });

    emitGlobal("arena_challenge_spawned", {
      challenge_id: challenge.id,
      category: challenge.category,
      claim: challenge.claim,
    });

    return Response.json({
      challenge_id: challenge.id,
      category: challenge.category,
      claim: challenge.claim,
      status: challenge.status,
    });
  } catch (err) {
    console.error("Arena challenge create error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
