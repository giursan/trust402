import { prisma } from "./db";
import { emitGlobal } from "./events";

/**
 * Spawn an arena challenge from a completed trust task.
 * The task's final verdict becomes the known answer.
 */
export async function spawnChallengeFromTask(taskId: string) {
  const task = await prisma.trustTask.findUnique({ where: { id: taskId } });
  if (!task || !task.finalVerdict) return null;

  const challenge = await prisma.arenaChallenge.create({
    data: {
      sourceTaskId: taskId,
      category: task.category,
      claim: task.claim,
      contextJson: task.contextJson,
      knownVerdict: task.finalVerdict,
      isHoneypot: false,
      difficulty: "normal",
      status: "OPEN",
    },
  });

  emitGlobal("arena_challenge_spawned", {
    challenge_id: challenge.id,
    category: challenge.category,
    claim: challenge.claim,
  });

  return challenge;
}

/**
 * Claim the next available arena challenge for a verifier.
 */
export async function claimNextChallenge(verifierId: string) {
  // Find next OPEN challenge
  const challenges = await prisma.arenaChallenge.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  // Skip challenges this verifier already attempted
  const attempted = await prisma.arenaResult.findMany({
    where: { verifierId },
    select: { challengeId: true },
  });
  const attemptedIds = new Set(attempted.map((a) => a.challengeId));
  const available = challenges.find((c) => !attemptedIds.has(c.id));

  if (!available) return null;

  // Mark as claimed
  await prisma.arenaChallenge.update({
    where: { id: available.id },
    data: { status: "CLAIMED" },
  });

  // Return challenge WITHOUT the known verdict (that would be cheating)
  return {
    id: available.id,
    category: available.category,
    claim: available.claim,
    context: JSON.parse(available.contextJson),
    difficulty: available.difficulty,
    isHoneypot: available.isHoneypot, // visible so the demo can show it
  };
}

/**
 * Submit a result for an arena challenge. Computes score and updates verifier.
 */
export async function submitArenaResult(
  challengeId: string,
  verifierId: string,
  verdict: string,
  confidence: number,
  evidence: string[],
  responseTimeMs: number,
  options: { completeChallenge?: boolean } = {}
) {
  const challenge = await prisma.arenaChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new Error("Challenge not found");

  const correct = verdict === challenge.knownVerdict;
  const isHoneypot = challenge.isHoneypot;

  // Scoring
  let score = correct ? 1.0 : -0.5;
  if (correct && confidence > 0.8) score += 0.2;
  if (correct && evidence.length >= 2) score += 0.15;
  if (correct && responseTimeMs < 3000) score += 0.1;
  if (!correct && isHoneypot) score = -2.0; // severe penalty for failing honeypot

  const result = await prisma.arenaResult.create({
    data: {
      challengeId,
      verifierId,
      verdict,
      confidence,
      evidenceJson: JSON.stringify(evidence),
      responseTimeMs,
      correct,
      scoreAwarded: score,
    },
  });

  if (options.completeChallenge ?? true) {
    await prisma.arenaChallenge.update({
      where: { id: challengeId },
      data: { status: "COMPLETED" },
    });
  }

  // Update verifier arena stats
  const verifier = await prisma.verifier.findUnique({ where: { id: verifierId } });
  if (verifier) {
    const newAttempts = verifier.arenaAttempts + 1;
    // Running average of scores, clamped to [0, 1]
    const rawScore = (verifier.arenaScore * verifier.arenaAttempts + Math.max(0, score)) / newAttempts;
    const newScore = Math.max(0, Math.min(1, rawScore));

    await prisma.verifier.update({
      where: { id: verifierId },
      data: {
        arenaAttempts: newAttempts,
        arenaScore: newScore,
      },
    });

    // Check graduation
    const graduated = checkGraduation(newAttempts, newScore);
    if (graduated && !verifier.arenaPassed) {
      await prisma.verifier.update({
        where: { id: verifierId },
        data: { arenaPassed: true },
      });
    }

    emitGlobal("arena_result", {
      challenge_id: challengeId,
      verifier_id: verifierId,
      verifier_name: verifier.name,
      correct,
      score_awarded: score,
      arena_score: newScore,
      arena_attempts: newAttempts,
      graduated: graduated && !verifier.arenaPassed,
      is_honeypot: isHoneypot,
    });

    return {
      result_id: result.id,
      correct,
      known_verdict: challenge.knownVerdict,
      score_awarded: score,
      arena_score: newScore,
      arena_attempts: newAttempts,
      graduated: graduated && !verifier.arenaPassed,
      is_honeypot: isHoneypot,
    };
  }

  return {
    result_id: result.id,
    correct,
    known_verdict: challenge.knownVerdict,
    score_awarded: score,
    arena_score: 0,
    arena_attempts: 0,
    graduated: false,
    is_honeypot: isHoneypot,
  };
}

function checkGraduation(attempts: number, score: number): boolean {
  return attempts >= 5 && score >= 0.7;
}

/**
 * Get the arena leaderboard sorted by score.
 */
export async function getLeaderboard() {
  const verifiers = await prisma.verifier.findMany({
    include: {
      arenaResults: { orderBy: { createdAt: "desc" }, take: 8 },
      payouts: true,
    },
    orderBy: [
      { arenaScore: "desc" },
      { reputation: "desc" },
    ],
  });

  return verifiers.map((v, index) => {
    const correct = v.arenaResults.filter((result) => result.correct).length;
    const totalPayoutSats = v.payouts.reduce((sum, payout) => sum + payout.amountSats, 0);
    const lastResult = v.arenaResults[0];

    return {
      rank: index + 1,
      verifier_id: v.id,
      name: v.name,
      type: v.type,
      categories: v.category.split(","),
      arena_score: v.arenaScore,
      arena_attempts: v.arenaAttempts,
      graduated: v.arenaPassed,
      reputation: v.reputation,
      min_price_sats: v.minPriceSats,
      stake_sats: v.stakeSats,
      total_payout_sats: totalPayoutSats,
      payout_count: v.payouts.length,
      correct_count: correct,
      win_rate: v.arenaResults.length > 0 ? correct / v.arenaResults.length : 0,
      last_verdict: lastResult?.verdict ?? null,
      last_correct: lastResult?.correct ?? null,
      recent_results: v.arenaResults.map((result) => ({
        verdict: result.verdict,
        confidence: result.confidence,
        correct: result.correct,
        score_awarded: result.scoreAwarded,
        created_at: result.createdAt,
      })),
    };
  });
}
