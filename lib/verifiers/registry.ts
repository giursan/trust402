export type ServiceAgentDefinition = {
  key: string;
  label: string;
  type: "TOOL_AGENT" | "SPECIALIST_AGENT";
  port: number;
  categories: string[];
};

export const SERVICE_AGENT_DEFINITIONS: ServiceAgentDefinition[] = [
  {
    key: "domain_age_agent",
    label: "Domain Age Agent",
    type: "TOOL_AGENT",
    port: 4101,
    categories: ["shopping_scam", "source_check"],
  },
  {
    key: "ssl_agent",
    label: "SSL Agent",
    type: "TOOL_AGENT",
    port: 4102,
    categories: ["shopping_scam", "source_check"],
  },
  {
    key: "visual_page_agent",
    label: "Visual Page Agent",
    type: "SPECIALIST_AGENT",
    port: 4103,
    categories: ["shopping_scam", "source_check"],
  },
  {
    key: "fraud_lens_agent",
    label: "FraudLens Agent",
    type: "SPECIALIST_AGENT",
    port: 4104,
    categories: ["shopping_scam", "source_check"],
  },
  {
    key: "osint_reputation_agent",
    label: "OSINT Reputation Agent",
    type: "SPECIALIST_AGENT",
    port: 4105,
    categories: ["shopping_scam", "source_check"],
  },
  {
    key: "checkout_guard_agent",
    label: "Checkout Guard Agent",
    type: "SPECIALIST_AGENT",
    port: 4106,
    categories: ["shopping_scam"],
  },
  {
    key: "brand_impersonation_agent",
    label: "Brand Impersonation Agent",
    type: "SPECIALIST_AGENT",
    port: 4107,
    categories: ["shopping_scam", "source_check"],
  },
  {
    key: "policy_reasoner_agent",
    label: "Policy Reasoner Agent",
    type: "TOOL_AGENT",
    port: 4108,
    categories: ["shopping_scam", "code_security", "legal_clause", "source_check"],
  },
  {
    key: "package_risk_agent",
    label: "Package Risk Agent",
    type: "SPECIALIST_AGENT",
    port: 4109,
    categories: ["code_security"],
  },
  {
    key: "legal_clause_agent",
    label: "Legal Clause Agent",
    type: "SPECIALIST_AGENT",
    port: 4110,
    categories: ["legal_clause"],
  },
];

export const SERVICE_AGENT_MAP = Object.fromEntries(
  SERVICE_AGENT_DEFINITIONS.map((agent) => [agent.key, agent])
);
