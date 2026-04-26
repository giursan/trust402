import { priceRoute, routeUtility } from "./pricing";

export type RouteDefinition = {
  key: string;
  label: string;
  verifierKeys: string[];
  baseCostSats: number;
  expectedConfidence: number;
  expectedLatencySeconds: number;
  maxConfidenceCap: number;
};

export const ROUTE_DEFINITIONS: RouteDefinition[] = [
  {
    key: "route_zero",
    label: "Route Zero — crowd prediction",
    verifierKeys: [],
    baseCostSats: 8,
    expectedConfidence: 0.70,
    expectedLatencySeconds: 12,
    maxConfidenceCap: 0.75,
  },
  {
    key: "agent_fast",
    label: "Fast service-agent quorum",
    verifierKeys: ["domain_age_agent", "ssl_agent", "checkout_guard_agent", "policy_reasoner_agent"],
    baseCostSats: 22,
    expectedConfidence: 0.8,
    expectedLatencySeconds: 10,
    maxConfidenceCap: 0.82,
  },
  {
    key: "balanced",
    label: "Balanced consensus route",
    verifierKeys: ["domain_age_agent", "visual_page_agent", "fraud_lens_agent", "brand_impersonation_agent", "human_reviewer_17"],
    baseCostSats: 52,
    expectedConfidence: 0.92,
    expectedLatencySeconds: 50,
    maxConfidenceCap: 0.94,
  },
  {
    key: "consensus",
    label: "Deep consensus proof",
    verifierKeys: [
      "domain_age_agent",
      "ssl_agent",
      "visual_page_agent",
      "fraud_lens_agent",
      "osint_reputation_agent",
      "checkout_guard_agent",
      "brand_impersonation_agent",
      "policy_reasoner_agent",
      "package_risk_agent",
      "legal_clause_agent",
      "human_reviewer_17",
      "human_reviewer_22",
    ],
    baseCostSats: 95,
    expectedConfidence: 0.97,
    expectedLatencySeconds: 190,
    maxConfidenceCap: 0.98,
  },
];

export type MarketState = {
  demandLevel: "low" | "medium" | "high";
  humanLiquidity: number;
  agentLiquidity: number;
  medianPriceSats: number;
  rushPremiumPct: number;
  currentDemand: number;
  recentDisagreementRate: number;
  avgReputation: number;
  priorConsensusStrength: number;
  noveltyScore: number;
};

export function buildRoutes(
  market: MarketState,
  policy: {
    max_budget_sats: number;
    deadline_seconds: number;
    min_confidence: number;
    risk_tolerance: string;
  },
  actionValueSats = 80000
) {
  const priced = ROUTE_DEFINITIONS.map((def) => {
    const price = priceRoute({
      baseCostSats: def.baseCostSats,
      riskLevel: policy.risk_tolerance as "low" | "medium" | "high",
      deadlineSeconds: policy.deadline_seconds,
      humanLiquidity: market.humanLiquidity,
      agentLiquidity: market.agentLiquidity,
      avgVerifierReputation: market.avgReputation,
      currentDemand: market.currentDemand,
      recentDisagreementRate: market.recentDisagreementRate,
      priorConsensusStrength: market.priorConsensusStrength,
      noveltyScore: market.noveltyScore,
    });

    return {
      routeKey: def.key,
      label: def.label,
      priceSats: price,
      expectedConfidence: def.expectedConfidence,
      expectedLatencySeconds: def.expectedLatencySeconds,
      verifierKeys: def.verifierKeys,
      maxConfidenceCap: def.maxConfidenceCap,
    };
  });

  // Find recommended: cheapest satisfying all constraints
  const satisfying = priced.filter(
    (r) =>
      r.expectedConfidence >= policy.min_confidence &&
      r.expectedLatencySeconds <= policy.deadline_seconds &&
      r.priceSats <= policy.max_budget_sats
  );

  let recommendedKey: string;
  if (satisfying.length > 0) {
    recommendedKey = satisfying.sort((a, b) => a.priceSats - b.priceSats)[0].routeKey;
  } else {
    // Best utility
    recommendedKey = priced
      .map((r) => ({ ...r, utility: routeUtility(r, policy, actionValueSats) }))
      .sort((a, b) => b.utility - a.utility)[0].routeKey;
  }

  return { routes: priced, recommendedKey };
}
