import type { VerifierContext, VerifierResult } from "./types";
import { getDomain } from "./helpers";

const SSL_FIXTURES: Record<string, { valid: boolean; mismatch: boolean; ageDays: number }> = {
  "discount-airpods-example.com": { valid: true, mismatch: false, ageDays: 4 },
  "scam-store-demo.com": { valid: false, mismatch: true, ageDays: 2 },
  "apple.com": { valid: true, mismatch: false, ageDays: 365 },
  "amazon.com": { valid: true, mismatch: false, ageDays: 365 },
};

export async function runSSLAgent(ctx: VerifierContext, reputation: number, costSats: number): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

  const url = ctx.url ?? "";
  const domain = getDomain(url);
  const hasHttps = url.startsWith("https://");
  const fixture = SSL_FIXTURES[domain];

  const evidence: string[] = [];
  let score = 0;

  if (!hasHttps) {
    evidence.push("Site does not use HTTPS");
    score -= 2;
  } else {
    evidence.push("HTTPS present");
    score += 1;
  }

  if (fixture) {
    if (fixture.mismatch) { evidence.push("SSL certificate domain mismatch"); score -= 2; }
    if (!fixture.valid) { evidence.push("Invalid SSL certificate"); score -= 2; }
    if (fixture.valid && !fixture.mismatch) { evidence.push(`Valid certificate (${fixture.ageDays} days old)`); score += 1; }
    if (fixture.ageDays < 7) { evidence.push("Certificate issued very recently"); score -= 1; }
  }

  const verdict = score >= 1 ? "safe" : score >= -1 ? "suspicious" : "unsafe";
  const confidence = 0.7 + Math.abs(score) * 0.05;

  return {
    verifierId: "ssl_agent",
    verifierType: "TOOL_AGENT",
    verdict,
    confidence: Math.min(0.9, confidence),
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
