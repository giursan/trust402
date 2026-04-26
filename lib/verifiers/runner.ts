import { runBrandImpersonationAgent } from "./brand-impersonation-agent";
import { runCheckoutGuardAgent } from "./checkout-guard-agent";
import { runDomainAgeAgent } from "./domain-age-agent";
import { runFraudLensAgent } from "./fraud-lens-agent";
import { runLegalClauseAgent } from "./legal-clause-agent";
import { runOsintReputationAgent } from "./osint-reputation-agent";
import { runPackageRiskAgent } from "./package-risk-agent";
import { runPolicyReasonerAgent } from "./policy-reasoner-agent";
import { runSSLAgent } from "./ssl-agent";
import type { VerifierContext, VerifierResult } from "./types";
import { runVisualPageAgent } from "./visual-page-agent";
import { runOpenAIVerifier } from "./openai-agent";

export async function runLocalVerifier(
  verifierKey: string,
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult | null> {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_VERIFIER_MODE !== "off") {
    try {
      const aiResult = await runOpenAIVerifier(verifierKey, ctx, reputation, costSats);
      if (aiResult) return aiResult;
    } catch (error) {
      console.warn(`[verifier:${verifierKey}] OpenAI fallback failed:`, error);
    }
  }

  switch (verifierKey) {
    case "domain_age_agent":
      return runDomainAgeAgent(ctx, reputation, costSats);
    case "ssl_agent":
      return runSSLAgent(ctx, reputation, costSats);
    case "visual_page_agent":
      return runVisualPageAgent(ctx, reputation, costSats);
    case "fraud_lens_agent":
      return runFraudLensAgent(ctx, reputation, costSats);
    case "osint_reputation_agent":
      return runOsintReputationAgent(ctx, reputation, costSats);
    case "checkout_guard_agent":
      return runCheckoutGuardAgent(ctx, reputation, costSats);
    case "brand_impersonation_agent":
      return runBrandImpersonationAgent(ctx, reputation, costSats);
    case "policy_reasoner_agent":
      return runPolicyReasonerAgent(ctx, reputation, costSats);
    case "package_risk_agent":
      return runPackageRiskAgent(ctx, reputation, costSats);
    case "legal_clause_agent":
      return runLegalClauseAgent(ctx, reputation, costSats);
    default:
      return null;
  }
}
