import type { VerifierContext, VerifierResult } from "./types";
import { getDomain } from "./helpers";

const REPUTATION_FIXTURES: Record<string, { risk: "safe" | "suspicious" | "unsafe"; evidence: string[]; confidence: number }> = {
  "discount-airpods-example.com": {
    risk: "unsafe",
    evidence: ["No trusted merchant mentions found", "Negative reputation pattern across OSINT feeds", "No credible brand footprint"],
    confidence: 0.9,
  },
  "worldbreaking-news-now.example": {
    risk: "suspicious",
    evidence: ["No established publisher reputation found", "Source identity inconsistent across references"],
    confidence: 0.76,
  },
  "apple.com": {
    risk: "safe",
    evidence: ["High-confidence global brand footprint", "Stable reputation across external references"],
    confidence: 0.94,
  },
};

export async function runOsintReputationAgent(
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 350 + Math.random() * 300));

  const domain = getDomain(ctx.url ?? "");
  const fixture = REPUTATION_FIXTURES[domain];

  return {
    verifierId: "osint_reputation_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict: fixture?.risk ?? "suspicious",
    confidence: fixture?.confidence ?? 0.62,
    evidence: fixture?.evidence ?? [`OSINT reputation for "${domain}" is sparse or inconsistent`],
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
