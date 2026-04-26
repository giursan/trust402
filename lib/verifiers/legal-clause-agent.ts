import type { VerifierContext, VerifierResult } from "./types";

export async function runLegalClauseAgent(
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 520 + Math.random() * 260));

  const evidence: string[] = [];

  if (ctx.category !== "legal_clause") {
    evidence.push("LegalClauseAgent only scores contract / policy tasks");
    return {
      verifierId: "legal_clause_agent",
      verifierType: "SPECIALIST_AGENT",
      verdict: "unknown",
      confidence: 0.45,
      evidence,
      latencyMs: Date.now() - start,
      costSats,
      reputation,
    };
  }

  evidence.push("Auto-accepting vendor terms shifts liability without human negotiation");
  evidence.push("No clause-level carve-outs or exception review attached");
  evidence.push("Contract acceptance should escalate when downstream spend is high");

  return {
    verifierId: "legal_clause_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict: "suspicious",
    confidence: 0.86,
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
