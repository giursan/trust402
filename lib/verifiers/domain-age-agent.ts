import type { VerifierContext, VerifierResult } from "./types";
import { getDomain } from "./helpers";

const DOMAIN_FIXTURES: Record<string, { ageDays: number; verdict: "safe" | "suspicious" | "unsafe"; evidence: string }> = {
  "discount-airpods-example.com": { ageDays: 4, verdict: "suspicious", evidence: "Domain registered 4 days ago" },
  "suspicious-deals.net": { ageDays: 12, verdict: "suspicious", evidence: "Domain registered 12 days ago" },
  "apple.com": { ageDays: 11000, verdict: "safe", evidence: "Long-established domain (30+ years)" },
  "amazon.com": { ageDays: 9500, verdict: "safe", evidence: "Long-established domain (25+ years)" },
  "scam-store-demo.com": { ageDays: 2, verdict: "unsafe", evidence: "Domain registered 2 days ago – extremely new" },
};

export async function runDomainAgeAgent(ctx: VerifierContext, reputation: number, costSats: number): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

  const domain = getDomain(ctx.url ?? "");
  const fixture = DOMAIN_FIXTURES[domain];

  let verdict: "safe" | "suspicious" | "unsafe";
  let confidence: number;
  let evidence: string[];

  if (fixture) {
    verdict = fixture.verdict;
    confidence = fixture.ageDays < 7 ? 0.88 : fixture.ageDays < 30 ? 0.75 : 0.9;
    evidence = [fixture.evidence];
  } else {
    // Unknown domain – treat as mildly suspicious
    verdict = "suspicious";
    confidence = 0.55;
    evidence = [`Domain "${domain}" has no verified age record`];
  }

  return {
    verifierId: "domain_age_agent",
    verifierType: "TOOL_AGENT",
    verdict,
    confidence,
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
