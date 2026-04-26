import type { VerifierContext, VerifierResult } from "./types";

export async function runPolicyReasonerAgent(
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 220 + Math.random() * 180));

  const evidence: string[] = [];
  let verdict: "safe" | "suspicious" | "unsafe" | "unknown" = "suspicious";
  let confidence = 0.7;

  if (ctx.category === "code_security") {
    verdict = "unsafe";
    confidence = 0.87;
    evidence.push("PolicyReasoner: executing unknown code should require external trust");
  } else if (ctx.category === "legal_clause") {
    verdict = "suspicious";
    confidence = 0.82;
    evidence.push("PolicyReasoner: legal acceptance boundary should escalate unless terms are strongly verified");
  } else if (ctx.category === "shopping_scam") {
    verdict = "unsafe";
    confidence = 0.81;
    evidence.push("PolicyReasoner: unknown merchant plus payment intent exceeds low-risk policy");
  } else if (ctx.category === "source_check") {
    verdict = "suspicious";
    confidence = 0.72;
    evidence.push("PolicyReasoner: unknown source should not be cited without independent corroboration");
  } else {
    verdict = "unknown";
    confidence = 0.52;
    evidence.push("PolicyReasoner: category not recognized for deterministic policy guidance");
  }

  return {
    verifierId: "policy_reasoner_agent",
    verifierType: "TOOL_AGENT",
    verdict,
    confidence,
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
