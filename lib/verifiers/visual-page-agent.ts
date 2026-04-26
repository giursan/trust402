import type { VerifierContext, VerifierResult } from "./types";
import { getDomain } from "./helpers";

const PAGE_FIXTURES: Record<string, { flags: string[]; verdict: "safe" | "suspicious" | "unsafe" }> = {
  "discount-airpods-example.com": {
    flags: [
      "Fake trust badge detected (McAfee SECURE not verified)",
      "Checkout processor does not match merchant identity",
      "No legally valid imprint/contact page found",
      "Unrealistic discount banner (70% OFF) with countdown timer",
    ],
    verdict: "unsafe",
  },
  "scam-store-demo.com": {
    flags: ["Phishing design pattern detected", "Brand logo mismatch with domain", "No contact or legal page"],
    verdict: "unsafe",
  },
  "apple.com": { flags: ["Legitimate brand page", "Proper legal disclosures present"], verdict: "safe" },
  "amazon.com": { flags: ["Legitimate marketplace", "Proper legal disclosures present"], verdict: "safe" },
};

export async function runVisualPageAgent(ctx: VerifierContext, reputation: number, costSats: number): Promise<VerifierResult> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 800));

  const domain = getDomain(ctx.url ?? "");
  const fixture = PAGE_FIXTURES[domain];

  let verdict: "safe" | "suspicious" | "unsafe";
  let evidence: string[];
  let confidence: number;

  if (fixture) {
    verdict = fixture.verdict;
    evidence = fixture.flags;
    confidence = fixture.verdict === "unsafe" ? 0.89 : 0.92;
  } else {
    verdict = "suspicious";
    evidence = ["Page structure analysis inconclusive", "No known trust signals detected"];
    confidence = 0.6;
  }

  return {
    verifierId: "visual_page_agent",
    verifierType: "SPECIALIST_AGENT",
    verdict,
    confidence,
    evidence,
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
