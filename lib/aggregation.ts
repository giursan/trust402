export type VerifierAssessment = {
  verifierId: string;
  verifierType: "TOOL_AGENT" | "SPECIALIST_AGENT" | "HUMAN";
  verdict: "safe" | "suspicious" | "unsafe" | "unknown";
  confidence: number;
  evidence: string[];
  latencyMs: number;
  costSats: number;
  reputation: number;
  signature?: string;
};

export type ConsensusMetrics = {
  weightedScore: number;
  agreementFactor: number;
  disagreementIndex: number;
  consensusFinality: number;
  uncertainty: number;
  quorumReached: boolean;
  state: "allow" | "block" | "escalate";
};

export type RewardAllocation = {
  verifierId: string;
  aligned: boolean;
  evidenceScore: number;
  baseSats: number;
  bonusSats: number;
  totalSats: number;
  rewardMultiplier: number;
};

const VERDICT_SCORES: Record<string, number> = {
  safe: 1,
  unknown: 0,
  suspicious: -0.5,
  unsafe: -1,
};

export function aggregateAssessments(
  assessments: VerifierAssessment[],
  confidenceCap: number
): {
  verdict: "safe" | "suspicious" | "unsafe" | "unknown";
  confidence: number;
  evidence: string[];
  disagreement: boolean;
  explanation: string;
  consensus: ConsensusMetrics;
} {
  if (assessments.length === 0) {
    return {
      verdict: "unknown",
      confidence: 0,
      evidence: [],
      disagreement: false,
      explanation: "No assessments",
      consensus: {
        weightedScore: 0,
        agreementFactor: 0,
        disagreementIndex: 1,
        consensusFinality: 0,
        uncertainty: 1,
        quorumReached: false,
        state: "escalate",
      },
    };
  }

  const scores = assessments.map((a) => VERDICT_SCORES[a.verdict] ?? 0);
  const weights = assessments.map((a) => a.confidence * a.reputation);
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const weightedScore = totalWeight > 0
    ? assessments.reduce((sum, a, i) => sum + (VERDICT_SCORES[a.verdict] ?? 0) * weights[i], 0) / totalWeight
    : 0;

  let verdict: "safe" | "suspicious" | "unsafe" | "unknown";
  if (weightedScore >= 0.45) verdict = "safe";
  else if (weightedScore <= -0.45) verdict = "unsafe";
  else verdict = "suspicious";

  // Agreement factor
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const agreementFactor = Math.max(0.5, 1 - stdDev * 0.5);

  // Evidence strength
  const evidenceScore = Math.min(1, assessments.reduce((s, a) => s + a.evidence.length, 0) / (assessments.length * 2));

  const rawConfidence = agreementFactor * (0.6 + evidenceScore * 0.4) * (0.7 + Math.abs(weightedScore) * 0.3);
  const confidence = Math.min(confidenceCap, rawConfidence);

  const evidence = [...new Set(assessments.flatMap((a) => a.evidence))];
  const disagreement = stdDev > 0.65 || (Math.max(...scores) - Math.min(...scores)) > 1.0;
  const disagreementIndex = Math.min(1, stdDev / 1.5 + (disagreement ? 0.15 : 0));
  const consensusFinality = Math.max(
    0,
    Math.min(1, agreementFactor * 0.45 + Math.abs(weightedScore) * 0.35 + confidence * 0.2)
  );
  const uncertainty = Math.max(0, Math.min(1, 1 - consensusFinality + disagreementIndex * 0.35));
  const quorumReached = confidence >= Math.min(confidenceCap * 0.9, 0.85);
  const state =
    verdict === "safe" ? "allow" :
    verdict === "unsafe" ? "block" :
    "escalate";

  const explanation = `${assessments.length} verifier(s); weighted score ${weightedScore.toFixed(2)}; agreement ${agreementFactor.toFixed(2)}; finality ${consensusFinality.toFixed(2)}; uncertainty ${uncertainty.toFixed(2)}`;

  return {
    verdict,
    confidence,
    evidence,
    disagreement,
    explanation,
    consensus: {
      weightedScore,
      agreementFactor,
      disagreementIndex,
      consensusFinality,
      uncertainty,
      quorumReached,
      state,
    },
  };
}

export function updateReputation(
  oldRep: number,
  assessment: VerifierAssessment,
  finalVerdict: string,
  latencyMs: number,
  deadlineMs: number
): number {
  const agreed = assessment.verdict === finalVerdict ? 1 : 0;
  const speedScore = latencyMs <= deadlineMs ? 1 : 0.5;
  const evidenceScore = assessment.evidence.length >= 2 ? 1 : 0.7;
  const taskScore = 0.6 * agreed + 0.2 * speedScore + 0.2 * evidenceScore;
  const delta = taskScore - oldRep;
  const learningRate = agreed ? 0.08 : 0.18;
  return Math.max(0.1, Math.min(1.0, oldRep + delta * learningRate));
}

export function computeConsensusRewards(
  assessments: VerifierAssessment[],
  finalVerdict: "safe" | "suspicious" | "unsafe" | "unknown",
  payoutPoolSats: number,
  consensusFinality: number
): RewardAllocation[] {
  if (assessments.length === 0 || payoutPoolSats <= 0) return [];

  const normalizedPool = Math.max(assessments.length, payoutPoolSats);
  const basePool = Math.round(normalizedPool * 0.55);
  const bonusPool = normalizedPool - basePool;
  const totalCost = assessments.reduce((sum, a) => sum + a.costSats, 0) || 1;

  const alignmentWeights = assessments.map((assessment) => {
    const aligned =
      finalVerdict === "unknown"
        ? true
        : assessment.verdict === finalVerdict ||
          (finalVerdict === "suspicious" && assessment.verdict === "unknown");
    const evidenceScore = Math.min(1.2, 0.6 + assessment.evidence.length * 0.2);
    const alignmentStrength = aligned ? 1 : 0.15;
    return {
      aligned,
      evidenceScore,
      weight: alignmentStrength * assessment.reputation * assessment.confidence * evidenceScore,
    };
  });

  const totalAlignmentWeight = alignmentWeights.reduce((sum, item) => sum + item.weight, 0) || 1;

  return assessments.map((assessment, index) => {
    const baseSats = Math.round((assessment.costSats / totalCost) * basePool);
    const bonusShare = alignmentWeights[index].weight / totalAlignmentWeight;
    const bonusSats = Math.round(bonusPool * bonusShare * (0.6 + consensusFinality * 0.4));
    const totalSats = baseSats + bonusSats;
    return {
      verifierId: assessment.verifierId,
      aligned: alignmentWeights[index].aligned,
      evidenceScore: alignmentWeights[index].evidenceScore,
      baseSats,
      bonusSats,
      totalSats,
      rewardMultiplier: totalSats / Math.max(1, assessment.costSats),
    };
  });
}
