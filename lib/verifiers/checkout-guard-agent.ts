import type { VerifierContext, VerifierResult } from "./types";
import { getDomain } from "./helpers";

export async function runCheckoutGuardAgent(
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 260 + Math.random() * 220));

  const domain = getDomain(ctx.url ?? "");
  const evidence: string[] = [];
  let riskScore = 0;

  if (ctx.category !== "shopping_scam") {
    evidence.push("CheckoutGuard found no checkout flow in this task category");
    return {
      verifierId: "checkout_guard_agent",
      verifierType: "SPECIALIST_AGENT",
      verdict: "unknown",
      confidence: 0.45,
      evidence,
      latencyMs: Date.now() - start,
      costSats,
      reputation,
    };
  }

  if (domain.includes("discount") || domain.includes("deal")) {
    evidence.push("Checkout routed through discount-style merchant domain");
    riskScore += 1;
  }

  if ((ctx.actionValueSats ?? ctx.offeredPrice ?? 0) > 0) {
    evidence.push("Payment action detected: irreversible spend boundary");
    riskScore += 1;
  }

  evidence.push("No payment processor identity proof provided");
  riskScore += 1;

  return {
    verifierId: "checkout_guard_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict: riskScore >= 3 ? "unsafe" : "suspicious",
    confidence: riskScore >= 3 ? 0.88 : 0.74,
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
