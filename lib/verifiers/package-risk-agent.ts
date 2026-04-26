import type { VerifierContext, VerifierResult } from "./types";
import { getDomain } from "./helpers";

export async function runPackageRiskAgent(
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 430 + Math.random() * 260));

  const domain = getDomain(ctx.url ?? "");
  const evidence: string[] = [];

  if (ctx.category !== "code_security") {
    evidence.push("PackageRiskAgent only scores code execution tasks");
    return {
      verifierId: "package_risk_agent",
      verifierType: "SPECIALIST_AGENT",
      verdict: "unknown",
      confidence: 0.44,
      evidence,
      latencyMs: Date.now() - start,
      costSats,
      reputation,
    };
  }

  let riskScore = 0;
  if (domain.includes("install") || domain.includes("tools")) {
    evidence.push("Executable script hosted on generic tooling domain");
    riskScore += 1;
  }
  if ((ctx.url ?? "").endsWith(".sh")) {
    evidence.push("One-line shell installer detected");
    riskScore += 2;
  }
  evidence.push("Package metadata provenance not independently verifiable");
  riskScore += 1;

  return {
    verifierId: "package_risk_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict: riskScore >= 3 ? "unsafe" : "suspicious",
    confidence: riskScore >= 3 ? 0.9 : 0.78,
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
