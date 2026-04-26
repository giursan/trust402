import type { VerifierContext, VerifierResult } from "./types";
import { getDomain, getPageTitle } from "./helpers";

export async function runBrandImpersonationAgent(
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 330 + Math.random() * 280));

  const domain = getDomain(ctx.url ?? "");
  const pageTitle = getPageTitle(ctx).toLowerCase();
  const evidence: string[] = [];
  let riskScore = 0;

  if (pageTitle.includes("airpods") && !domain.includes("apple")) {
    evidence.push("Brand-product mismatch: Apple product sold outside official brand domain");
    riskScore += 2;
  }

  if (pageTitle.includes("exclusive leak") && domain.includes("news")) {
    evidence.push("Sensational news framing increases impersonation / spoofing risk");
    riskScore += 1;
  }

  if (domain.includes("discount") || domain.includes("fastlane")) {
    evidence.push("Domain naming pattern suggests a thin wrapper around a known brand / service category");
    riskScore += 1;
  }

  if (evidence.length === 0) {
    evidence.push("No obvious brand impersonation pattern detected");
  }

  return {
    verifierId: "brand_impersonation_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict: riskScore >= 3 ? "unsafe" : riskScore >= 1 ? "suspicious" : "safe",
    confidence: Math.min(0.91, 0.67 + riskScore * 0.08),
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
