export type PricingInputs = {
  baseCostSats: number;
  riskLevel: "low" | "medium" | "high";
  deadlineSeconds: number;
  humanLiquidity: number;
  agentLiquidity: number;
  avgVerifierReputation: number;
  currentDemand: number;
  recentDisagreementRate: number;
  priorConsensusStrength: number;
  noveltyScore: number;
};

export function priceRoute(inputs: PricingInputs): number {
  const riskMultiplier = { low: 1.0, medium: 1.25, high: 1.6 }[inputs.riskLevel];

  const urgencyMultiplier =
    inputs.deadlineSeconds <= 10 ? 1.8 :
    inputs.deadlineSeconds <= 45 ? 1.35 :
    inputs.deadlineSeconds <= 180 ? 1.1 : 1.0;

  const scarcityMultiplier =
    inputs.humanLiquidity <= 1 ? 1.6 :
    inputs.humanLiquidity <= 3 ? 1.25 : 1.0;

  const reputationMultiplier = 1 + Math.max(0, inputs.avgVerifierReputation - 0.75);
  const disagreementMultiplier = 1 + inputs.recentDisagreementRate * 0.55;
  const demandMultiplier = 1 + Math.min(inputs.currentDemand / 100, 0.75);
  const uncertaintyMultiplier =
    1 +
    inputs.noveltyScore * 0.35 +
    Math.max(0, 1 - inputs.priorConsensusStrength) * 0.45;
  const consensusDiscount = Math.max(0.8, 1 - inputs.priorConsensusStrength * 0.18);

  const raw =
    inputs.baseCostSats *
    riskMultiplier *
    urgencyMultiplier *
    scarcityMultiplier *
    reputationMultiplier *
    disagreementMultiplier *
    demandMultiplier *
    uncertaintyMultiplier *
    consensusDiscount;

  const platformFee = Math.max(2, Math.ceil(raw * 0.15));
  return Math.ceil(raw + platformFee);
}

export function routeUtility(
  route: { expectedConfidence: number; priceSats: number; expectedLatencySeconds: number },
  policy: { deadline_seconds: number; risk_tolerance: string },
  actionValueSats: number
) {
  const riskWeight =
    policy.risk_tolerance === "low" ? 1.5 :
    policy.risk_tolerance === "medium" ? 1.0 : 0.7;
  const confidenceValue = route.expectedConfidence * actionValueSats * 0.001 * riskWeight;
  const latencyPenalty = Math.max(0, route.expectedLatencySeconds - policy.deadline_seconds) * 0.1;
  return confidenceValue - route.priceSats - latencyPenalty;
}
