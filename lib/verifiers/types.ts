export type VerifierResult = {
  verifierId: string;
  verifierType: "TOOL_AGENT" | "SPECIALIST_AGENT" | "HUMAN";
  verdict: "safe" | "suspicious" | "unsafe" | "unknown";
  confidence: number;
  evidence: string[];
  latencyMs: number;
  costSats: number;
  reputation: number;
};

export type VerifierContext = {
  url?: string;
  pageTitle?: string;
  page_title?: string;
  screenshotUrl?: string;
  productName?: string;
  offeredPrice?: number;
  typicalPrice?: number;
  actionValueSats?: number;
  action_value_sats?: number;
  category?: string;
  claim?: string;
};
