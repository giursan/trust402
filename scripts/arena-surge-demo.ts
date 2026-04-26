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
  {
    key: "apple_store_safe",
    title: "Apple Store",
    category: "shopping_scam",
    claim: "Decide whether this Apple Store checkout is safe for an automated purchase.",
    known_verdict: "safe",
    escrow_sats: 36,
    stake_sats: 2,
    goal: "Purchase genuine accessories from apple.com only if it is verified as the official store.",
    context: {
      url: "https://apple.com/shop",
      page_title: "Apple Store",
      action_value_sats: 120000,
    },
    policy: {
      max_budget_sats: 150,
      deadline_seconds: 60,
      min_confidence: 0.9,
      risk_tolerance: "low",
    },
  },
];

function apiBase() {
  return process.env.TRUST402_API_BASE ?? "http://127.0.0.1:3000";
}

function log(actor: string, message: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), actor, message, ...data }));
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    throw new Error(`POST ${path} failed (${res.status}): ${typeof parsed === "string" ? parsed : JSON.stringify(parsed)}`);
  }

  return parsed as Record<string, unknown>;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForArenaConsensus(challengeId: string) {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const res = await fetch(`${apiBase()}/api/arena/challenges`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Arena status failed (${res.status})`);
    const payload = await res.json() as { challenges?: Array<Record<string, unknown>> };
    const challenge = payload.challenges?.find((item) => item.id === challengeId);
    if (challenge?.consensus) {
      return challenge;
    }
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for arena consensus on ${challengeId}`);
}

async function runBuyerFlow(scenario: Scenario, agentIndex: number) {
  const actor = `buyer_surge_${agentIndex}_${scenario.key}`;
  const buyerAgent = {
    id: `agent_${actor}`,
    name: `SurgeBot-${agentIndex}-${scenario.key.slice(0, 4)}`,
  };

  try {
    log(actor, "starting_flow", { scenario: scenario.key });

    // 1. Get Quote
    const quote = await postJson("/api/trust/quote", {
      buyer_agent: buyerAgent,
      claim: scenario.goal,
      category: scenario.category,
      context: scenario.context,
      policy: scenario.policy,
    });
    const taskId = quote.task_id as string;
    const routes = (quote.routes as Array<Record<string, unknown>> | undefined) ?? [];
    const recommendedRoute = (quote.recommended_route as string | undefined) ?? routes[0]?.route_id ?? routes[0]?.routeKey ?? null;

    if (!recommendedRoute) throw new Error("No route returned");

    // 2. Publish Arena Challenge
    const arenaChallenge = await postJson("/api/arena/challenges", {
      source_task_id: taskId,
      category: scenario.category,
      claim: scenario.claim,
      context: { ...scenario.context, buyer_agent: buyerAgent },
      known_verdict: scenario.known_verdict,
      is_honeypot: false,
      difficulty: "normal",
      escrow_sats: scenario.escrow_sats,
      stake_sats: scenario.stake_sats,
    });
    const challengeId = arenaChallenge.challenge_id as string;
    log(actor, "arena_challenge_created", { challenge_id: challengeId });

    // 3. Broadcast
    log(actor, "broadcasting_round", { challenge_id: challengeId });
    await postJson(`/api/arena/${challengeId}/broadcast`, {});

    // 4. Wait for Consensus
    const consensus = await waitForArenaConsensus(challengeId);
    log(actor, "consensus_achieved", { challenge_id: challengeId, verdict: (consensus.consensus as any).verdict });

    // 5. Select Route & Settle
    await postJson(`/api/trust/${taskId}/select-route`, { route_id: recommendedRoute });
    
    const isMock = process.env.DEMO_MODE === "mock" || !process.env.ALBY_NWC_CONNECTION_SECRET;

    if (!isMock) {
      // Real Lightning flow: Fetch the task's invoice and pay it
      const taskRes = await fetch(`${apiBase()}/api/trust/${taskId}`, { cache: "no-store" });
      const taskData = await taskRes.json();
      const invoice = taskData.payments?.[0]?.invoice;
      
      if (invoice) {
        log(actor, "paying_invoice", { invoice: invoice.slice(0, 20) + "..." });
        const { getPaymentProvider } = require("../lib/payments/provider");
        const provider = getPaymentProvider();
        if (provider.payInvoice) {
          const payResult = await provider.payInvoice(invoice);
          if (!payResult.paid) {
            throw new Error("Alby payment failed - check your balance or connection secret");
          }
          log(actor, "payment_sent", { receipt: payResult.receipt?.slice(0, 10) + "..." });
        }
      }
    }

    await postJson("/api/payments/settle", { 
      task_id: taskId, 
      force_mock_settle: isMock 
    });
    
    // 6. Execute
    await postJson(`/api/trust/${taskId}/execute`, {});
    log(actor, "flow_completed", { task_id: taskId });

  } catch (error) {
    log(actor, "flow_failed", { error: String(error) });
  }
}

async function main() {
  const countArg = process.argv.find(arg => arg.startsWith("--count="))?.split("=")[1];
  const count = countArg ? parseInt(countArg) : 4;
  
  console.log(JSON.stringify({ ts: new Date().toISOString(), message: `Starting Arena Surge Demo with ${count} parallel agents...` }));

  const tasks: Promise<void>[] = [];

  for (let i = 0; i < count; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    // Add jitter: offset each start by 0-5 seconds
    const jitter = Math.random() * 5000;
    
    tasks.push((async () => {
      await sleep(jitter);
      await runBuyerFlow(scenario, i);
    })());
  }

  await Promise.all(tasks);
  console.log(JSON.stringify({ ts: new Date().toISOString(), message: "All surge agents have completed their flows." }));
}

main().catch(console.error);
