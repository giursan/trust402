import type { VerifierContext, VerifierResult } from "./types";
import { getDomain, getPageTitle } from "./helpers";

export async function runFraudLensAgent(ctx: VerifierContext, reputation: number, costSats: number): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

  const domain = getDomain(ctx.url ?? "");

  // Price anomaly check
  const evidence: string[] = [];
  let riskScore = 0;

  if (ctx.offeredPrice && ctx.typicalPrice) {
    const discount = 1 - ctx.offeredPrice / ctx.typicalPrice;
    if (discount > 0.55) {
      evidence.push(`Price anomaly: ${Math.round(discount * 100)}% below market (${ctx.offeredPrice} vs ${ctx.typicalPrice})`);
      riskScore += 2;
    } else if (discount > 0.35) {
      evidence.push(`Unusually low price: ${Math.round(discount * 100)}% below market`);
      riskScore += 1;
    }
  }

  // Known scam domains
  if (domain.includes("discount") || domain.includes("deal") || domain.includes("cheap") || domain.includes("off")) {
    evidence.push("Domain name contains known scam keywords");
    riskScore += 1;
  }

  const pageTitle = getPageTitle(ctx);
  if (pageTitle && /\d+%\s*off|limited time|act now|only \d+ left/i.test(pageTitle)) {
    evidence.push("High-pressure sales language detected in page title");
    riskScore += 1;
  }

  if (evidence.length === 0) {
    evidence.push("No fraud signals detected by FraudLens");
  }

  const verdict = riskScore >= 3 ? "unsafe" : riskScore >= 1 ? "suspicious" : "safe";
  const confidence = 0.72 + riskScore * 0.04;

  return {
    verifierId: "fraud_lens_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict,
    confidence: Math.min(0.93, confidence),
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
