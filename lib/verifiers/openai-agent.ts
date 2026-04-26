import type { VerifierContext, VerifierResult } from "./types";

type OpenAIVerdict = {
  verdict: "safe" | "suspicious" | "unsafe" | "unknown";
  confidence: number;
  evidence: string[];
};

type SourceItem = {
  url?: string;
  title?: string;
};

const VERIFIER_PERSONAS: Record<string, string> = {
  domain_age_agent: "You focus on domain age, domain plausibility, and whether a domain looks disposable or established.",
  ssl_agent: "You focus on HTTPS, certificate plausibility, checkout transport risk, and security hygiene.",
  visual_page_agent: "You focus on page copy, urgency tactics, fake trust badges, brand mismatch, and visual scam signals.",
  fraud_lens_agent: "You are a fraud analyst combining merchant, checkout, and offer-risk signals.",
  osint_reputation_agent: "You focus on public reputation, source credibility, and whether the entity seems trustworthy.",
  checkout_guard_agent: "You focus on payment flow safety, checkout processor mismatch, and irreversible-spend risk.",
  brand_impersonation_agent: "You focus on brand impersonation, typosquatting, fake offers, and spoofed storefronts.",
  policy_reasoner_agent: "You focus on whether the protected action satisfies the buyer policy under uncertainty.",
  package_risk_agent: "You focus on shell scripts, packages, dependency risk, and code execution safety.",
  legal_clause_agent: "You focus on contract, terms, legal risk, and whether automated acceptance is safe.",
};

const OFFICIAL_DOMAIN_HINTS = [
  "apple.com",
  "amazon.com",
  "google.com",
  "microsoft.com",
  "github.com",
  "openai.com",
  "stripe.com",
  "paypal.com",
];

const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["safe", "suspicious", "unsafe", "unknown"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    evidence: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
  },
  required: ["verdict", "confidence", "evidence"],
};

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }

  return null;
}

function normalizeVerdict(value: unknown): OpenAIVerdict | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<OpenAIVerdict>;
  if (!["safe", "suspicious", "unsafe", "unknown"].includes(String(raw.verdict))) return null;
  if (typeof raw.confidence !== "number") return null;
  if (!Array.isArray(raw.evidence)) return null;

  return {
    verdict: raw.verdict as OpenAIVerdict["verdict"],
    confidence: Math.max(0, Math.min(1, raw.confidence)),
    evidence: raw.evidence.filter((item): item is string => typeof item === "string").slice(0, 5),
  };
}

function extractSources(payload: unknown): SourceItem[] {
  if (!payload || typeof payload !== "object") return [];
  const sources: SourceItem[] = [];

  const output = (payload as { output?: unknown }).output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!item || typeof item !== "object") continue;

      const action = (item as { action?: unknown }).action;
      if (action && typeof action === "object") {
        const actionSources = (action as { sources?: unknown }).sources;
        if (Array.isArray(actionSources)) {
          for (const source of actionSources) {
            if (!source || typeof source !== "object") continue;
            const url = (source as { url?: unknown }).url;
            const title = (source as { title?: unknown }).title;
            if (typeof url === "string") sources.push({ url, title: typeof title === "string" ? title : undefined });
          }
        }
      }

      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const part of content) {
        if (!part || typeof part !== "object") continue;
        const annotations = (part as { annotations?: unknown }).annotations;
        if (!Array.isArray(annotations)) continue;
        for (const annotation of annotations) {
          if (!annotation || typeof annotation !== "object") continue;
          const url = (annotation as { url?: unknown }).url;
          const title = (annotation as { title?: unknown }).title;
          if (typeof url === "string") sources.push({ url, title: typeof title === "string" ? title : undefined });
        }
      }
    }
  }

  const seen = new Set<string>();
  return sources.filter((source) => {
    if (!source.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  }).slice(0, 3);
}

export async function runOpenAIVerifier(
  verifierKey: string,
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const start = Date.now();
  const model = process.env.OPENAI_VERIFIER_MODEL ?? "gpt-5.4-mini";
  const persona = VERIFIER_PERSONAS[verifierKey] ?? "You are a cautious trust and safety verifier.";
  const useWebSearch = process.env.OPENAI_VERIFIER_WEB_SEARCH === "on";
  const url = ctx.url ?? "";
  const officialDomain = OFFICIAL_DOMAIN_HINTS.find((domain) => url.includes(domain));
  const calibrationHint = officialDomain
    ? `Calibration hint: the URL contains the well-known official domain ${officialDomain}. If the page title/claim matches that organization and there are no concrete spoofing, payment, legal, or execution-risk indicators, do not mark it suspicious solely because extra evidence is absent.`
    : "Calibration hint: unknown, synthetic, typo-squatted, newly introduced, or .example domains should remain suspicious unless the context gives concrete positive trust signals.";

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "developer",
          content: [
            {
              type: "input_text",
              text: [
                "You are a Trust402 verifier agent.",
                persona,
                "Return only a strict JSON object matching the supplied schema.",
                useWebSearch
                  ? "You may use web search when it helps validate source reputation, brand legitimacy, package safety, or legal/business risk. If the target is an .example demo domain, treat it as a synthetic demo target and reason from context."
                  : "Judge only from the provided task context. Do not claim you browsed the web.",
                calibrationHint,
                "Avoid false-negative safe honeypot failures: insufficient context alone is not a reason for suspicious/unknown when the domain is an official high-reputation domain and the claim/page title is consistent.",
                "Still mark suspicious or unsafe if there are concrete red flags: domain mismatch, spoofing, fake urgency, unrealistic discounts, risky shell execution, suspicious payment processor, harmful legal terms, or mismatch between claim and context.",
                "Use verdict safe only when the action is clearly low risk. Use unsafe for clear scam, fraud, execution, or legal danger. Use suspicious for uncertainty.",
              ].join("\n"),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                verifier: verifierKey,
                task: ctx,
              }, null, 2),
            },
          ],
        },
      ],
      tools: useWebSearch ? [{ type: "web_search" }] : undefined,
      tool_choice: useWebSearch ? "auto" : undefined,
      include: useWebSearch ? ["web_search_call.action.sources"] : undefined,
      text: {
        format: {
          type: "json_schema",
          name: "trust402_verifier_verdict",
          strict: true,
          schema: VERDICT_SCHEMA,
        },
      },
      max_output_tokens: 500,
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) return null;

  const payload = await res.json();
  const outputText = extractOutputText(payload);
  if (!outputText) return null;

  const parsed = normalizeVerdict(JSON.parse(outputText));
  if (!parsed) return null;
  const sources = extractSources(payload);
  const sourceEvidence = sources.map((source) => `Source checked: ${source.title ? `${source.title} — ` : ""}${source.url}`);

  return {
    verifierId: verifierKey,
    verifierType: verifierKey.includes("agent") ? "SPECIALIST_AGENT" : "TOOL_AGENT",
    verdict: parsed.verdict,
    confidence: parsed.confidence,
    evidence: [
      `[Real OpenAI agent: ${model}${useWebSearch ? " + web_search" : ""}]`,
      ...parsed.evidence,
      ...sourceEvidence,
    ],
    latencyMs: Date.now() - start,
    costSats,
    reputation,
  };
}
