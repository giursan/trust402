import "dotenv/config";

type Scenario = {
  key: string;
  title: string;
  category: string;
  claim: string;
  known_verdict: "safe" | "suspicious" | "unsafe";
  escrow_sats: number;
  stake_sats: number;
  goal: string;
  context: {
    url: string;
    page_title?: string;
    action_value_sats: number;
  };
  policy: {
    max_budget_sats: number;
    deadline_seconds: number;
    min_confidence: number;
    risk_tolerance: "low" | "medium" | "high";
  };
};

const SCENARIOS: Scenario[] = [
  {
    key: "shopping_checkout",
    title: "Shopping Checkout",
    category: "shopping_scam",
    claim: "Decide whether the buyer agent should pay discount-airpods-example.com before checkout.",
    known_verdict: "unsafe",
    escrow_sats: 48,
    stake_sats: 3,
    goal: "Buy discounted AirPods from discount-airpods-example.com only if it is trustworthy.",
    context: {
      url: "https://discount-airpods-example.com/checkout",
      page_title: "AirPods Pro — 70% Off!",
      action_value_sats: 80000,
    },
    policy: {
      max_budget_sats: 200,
      deadline_seconds: 120,
      min_confidence: 0.85,
      risk_tolerance: "low",
    },
  },
  {
    key: "source_check",
    title: "Source Verification",
    category: "source_check",
    claim: "Decide whether the research agent should cite this breaking-news source.",
    known_verdict: "unsafe",
    escrow_sats: 30,
    stake_sats: 2,
    goal: "Cite worldbreaking-news-now.example only if the source appears credible.",
    context: {
      url: "https://worldbreaking-news-now.example/story/mega-deal",
      page_title: "Exclusive leak: emergency market-moving story",
      action_value_sats: 15000,
    },
    policy: {
      max_budget_sats: 120,
      deadline_seconds: 90,
      min_confidence: 0.8,
      risk_tolerance: "medium",
    },
  },
  {
    key: "code_security",
    title: "Code Execution Gate",
    category: "code_security",
    claim: "Decide whether the coding agent should execute this install script.",
    known_verdict: "unsafe",
    escrow_sats: 64,
    stake_sats: 4,
    goal: "Run install script from fast-auth-tools.example only if the package looks safe.",
    context: {
      url: "https://fast-auth-tools.example/install.sh",
      page_title: "One-line install script",
      action_value_sats: 50000,
    },
    policy: {
      max_budget_sats: 180,
      deadline_seconds: 60,
      min_confidence: 0.88,
      risk_tolerance: "low",
    },
  },
];

function apiBase() {
  return process.env.TRUST402_API_BASE ?? "http://127.0.0.1:3000";
}

function pickScenario() {
  const key = process.argv.find((arg) => arg.startsWith("--scenario="))?.split("=")[1] ?? "shopping_checkout";
  return SCENARIOS.find((scenario) => scenario.key === key) ?? SCENARIOS[0];
}

function log(message: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), actor: "buyer_arena_demo", message, ...data }));
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    throw new Error(`POST ${path} failed (${res.status}): ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
  }

  return parsed as Record<string, unknown>;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForArenaConsensus(challengeId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const res = await fetch(`${apiBase()}/api/arena/challenges`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Arena status failed (${res.status})`);
    const payload = await res.json() as { challenges?: Array<Record<string, unknown>> };
    const challenge = payload.challenges?.find((item) => item.id === challengeId);
    if (challenge?.consensus) {
      return challenge;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for arena consensus on ${challengeId}`);
}

async function main() {
  const scenario = pickScenario();
  const buyerAgent = {
    id: `buyer_arena_demo_${scenario.key}`,
    name: `BuyerBot-${scenario.title.replace(/\s+/g, "")}`,
  };

  log("starting", { scenario: scenario.key, category: scenario.category });
  log("requesting_quote", { goal: scenario.goal, policy: scenario.policy, context: scenario.context });

  const quote = await postJson("/api/trust/quote", {
    buyer_agent: buyerAgent,
    claim: scenario.goal,
    category: scenario.category,
    context: scenario.context,
    policy: scenario.policy,
  });

  const routes = (quote.routes as Array<Record<string, unknown>> | undefined) ?? [];
  const recommendedRoute = (quote.recommended_route as string | undefined) ?? routes[0]?.route_id ?? routes[0]?.routeKey ?? null;
  const taskId = quote.task_id as string;

  log("quote_received", {
    task_id: taskId,
    quote_id: quote.quote_id,
    market: quote.market,
    route_count: routes.length,
    recommended_route: recommendedRoute,
  });

  if (!recommendedRoute) {
    throw new Error("No route returned by the quote API");
  }

  log("publishing_arena_challenge", {
    category: scenario.category,
    claim: scenario.claim,
    escrow_sats: scenario.escrow_sats,
    stake_sats: scenario.stake_sats,
  });
  const arenaChallenge = await postJson("/api/arena/challenges", {
    category: scenario.category,
    claim: scenario.claim,
    context: {
      ...scenario.context,
      buyer_agent: buyerAgent,
    },
    known_verdict: scenario.known_verdict,
    is_honeypot: false,
    difficulty: "normal",
    escrow_sats: scenario.escrow_sats,
    stake_sats: scenario.stake_sats,
  });

  const challengeId = arenaChallenge.challenge_id as string;
  log("arena_challenge_created", {
    challenge_id: challengeId,
    status: arenaChallenge.status,
  });

  log("broadcasting_arena_round", { challenge_id: challengeId });
  const broadcast = await postJson(`/api/arena/${challengeId}/broadcast`, {});
  log("arena_broadcast_completed", broadcast);

  const consensus = await waitForArenaConsensus(challengeId);
  log("arena_consensus_ready", {
    challenge_id: challengeId,
    consensus: consensus.consensus,
    result_count: consensus.result_count,
    reward_paid_sats: consensus.reward_paid_sats,
  });

  const selected = await postJson(`/api/trust/${taskId}/select-route`, {
    route_id: recommendedRoute,
  });
  log("route_selected", {
    route_id: recommendedRoute,
    amount_sats: selected.amount_sats,
    route: selected.route,
  });

  const settled = await postJson("/api/payments/settle", {
    task_id: taskId,
    force_mock_settle: true,
  });
  log("payment_settled", settled);

  const executed = await postJson(`/api/trust/${taskId}/execute`, {});
  log("execution_finished", executed);

  const proofRes = await fetch(`${apiBase()}/api/trust/${taskId}/proof`, { cache: "no-store" });
  const proof = proofRes.ok ? await proofRes.json() : null;
  log("proof_ready", {
    verdict: proof?.verdict ?? null,
    confidence: proof?.confidence ?? null,
    proof_id: proof?.proof_id ?? null,
  });
}

main().catch((err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), actor: "buyer_arena_demo", error: String(err) }));
  process.exitCode = 1;
});
