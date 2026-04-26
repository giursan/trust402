import type { MarketState } from "./routes";

// In-memory market state (reset on server restart - fine for hackathon)
type CategoryMarket = {
  category: string;
  demand: number; // 0–100
  humanLiquidity: number;
  agentLiquidity: number;
  avgReputation: number;
  recentDisagreementRate: number;
  priorConsensusStrength: number;
  noveltyScore: number;
  volume24hSats: number;
  unsafeCount: number;
  totalCount: number;
};

const categoryMarkets = new Map<string, CategoryMarket>([
  ["shopping_scam", {
    category: "shopping_scam", demand: 65, humanLiquidity: 3, agentLiquidity: 7,
    avgReputation: 0.85, recentDisagreementRate: 0.15, priorConsensusStrength: 0.82, noveltyScore: 0.28, volume24hSats: 1820,
    unsafeCount: 9, totalCount: 14,
  }],
  ["source_check", {
    category: "source_check", demand: 35, humanLiquidity: 1, agentLiquidity: 4,
    avgReputation: 0.78, recentDisagreementRate: 0.08, priorConsensusStrength: 0.64, noveltyScore: 0.42, volume24hSats: 640,
    unsafeCount: 3, totalCount: 14,
  }],
  ["code_security", {
    category: "code_security", demand: 40, humanLiquidity: 0, agentLiquidity: 3,
    avgReputation: 0.82, recentDisagreementRate: 0.1, priorConsensusStrength: 0.47, noveltyScore: 0.7, volume24hSats: 920,
    unsafeCount: 4, totalCount: 13,
  }],
  ["legal_clause", {
    category: "legal_clause", demand: 20, humanLiquidity: 1, agentLiquidity: 2,
    avgReputation: 0.91, recentDisagreementRate: 0.05, priorConsensusStrength: 0.58, noveltyScore: 0.62, volume24hSats: 380,
    unsafeCount: 2, totalCount: 8,
  }],
]);

export function getMarketState(category: string): MarketState {
  const m = categoryMarkets.get(category) ?? categoryMarkets.get("shopping_scam")!;
  const demandLevel: "low" | "medium" | "high" = m.demand > 60 ? "high" : m.demand > 30 ? "medium" : "low";
  const rushPremium = Math.round((m.demand / 100) * 25 + (3 - Math.min(m.humanLiquidity, 3)) * 5);
  return {
    demandLevel,
    humanLiquidity: m.humanLiquidity,
    agentLiquidity: m.agentLiquidity,
    medianPriceSats: Math.round(30 + m.demand * 0.3),
    rushPremiumPct: rushPremium,
    currentDemand: m.demand,
    recentDisagreementRate: m.recentDisagreementRate,
    avgReputation: m.avgReputation,
    priorConsensusStrength: m.priorConsensusStrength,
    noveltyScore: m.noveltyScore,
  };
}

export function incrDemand(category: string, delta = 5) {
  const m = categoryMarkets.get(category);
  if (m) {
    m.demand = Math.min(100, m.demand + delta);
    m.noveltyScore = Math.min(1, m.noveltyScore + delta * 0.004);
  }
}

export function recordVerdict(
  category: string,
  verdict: string,
  priceSats: number,
  metrics?: { disagreement?: boolean; consensusFinality?: number }
) {
  const m = categoryMarkets.get(category);
  if (!m) return;
  m.totalCount++;
  m.volume24hSats += priceSats;
  if (verdict === "unsafe") m.unsafeCount++;
  const finality = metrics?.consensusFinality ?? 0.6;
  m.priorConsensusStrength = Math.max(0.2, Math.min(0.98, m.priorConsensusStrength * 0.88 + finality * 0.12));
  m.noveltyScore = Math.max(0.08, m.noveltyScore * 0.86 + (metrics?.disagreement ? 0.24 : 0.08));
  m.recentDisagreementRate = Math.max(
    0.02,
    Math.min(0.7, m.recentDisagreementRate * 0.85 + (metrics?.disagreement ? 0.15 : 0.03))
  );
}

export function recordArenaRound(
  category: string,
  stats: {
    totalRewardSats: number;
    correctCount: number;
    submissionCount: number;
    disagreement: boolean;
  }
) {
  const m = categoryMarkets.get(category);
  if (!m) return;
  const correctness = stats.submissionCount > 0 ? stats.correctCount / stats.submissionCount : 0;
  m.demand = Math.min(100, m.demand + Math.max(1, Math.ceil(stats.submissionCount * 0.6)));
  m.agentLiquidity = Math.max(1, m.agentLiquidity + Math.min(2, Math.ceil(stats.correctCount / 4)));
  m.volume24hSats += stats.totalRewardSats;
  m.totalCount += Math.max(1, stats.submissionCount);
  m.priorConsensusStrength = Math.max(0.2, Math.min(0.98, m.priorConsensusStrength * 0.85 + correctness * 0.15));
  m.noveltyScore = Math.max(0.08, Math.min(1, m.noveltyScore * 0.84 + (stats.disagreement ? 0.2 : 0.06)));
  m.recentDisagreementRate = Math.max(
    0.02,
    Math.min(0.7, m.recentDisagreementRate * 0.82 + (stats.disagreement ? 0.16 : 0.02))
  );
}

export function getAllCategories() {
  return Array.from(categoryMarkets.values()).map((m) => ({
    category: m.category,
    demandLevel: m.demand > 60 ? "high" : m.demand > 30 ? "medium" : "low",
    humanLiquidity: m.humanLiquidity,
    agentLiquidity: m.agentLiquidity,
    medianPriceSats: Math.round(30 + m.demand * 0.3),
    rushPremiumPct: Math.round((m.demand / 100) * 25),
    unsafeRate: m.totalCount > 0 ? m.unsafeCount / m.totalCount : 0,
    volume24hSats: m.volume24hSats,
    priorConsensusStrength: m.priorConsensusStrength,
    noveltyScore: m.noveltyScore,
  }));
}
