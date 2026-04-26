import "dotenv/config";

const BASE_URL = process.env.TRUST402_BASE_URL ?? "http://127.0.0.1:3000";

const DEMO_CHALLENGES = [
  {
    category: "shopping_scam",
    claim: "Decide whether the buyer agent should pay discount-airpods-example.com before checkout.",
    known_verdict: "unsafe",
    escrow_sats: 48,
    stake_sats: 3,
    context: {
      url: "https://discount-airpods-example.com/checkout",
      page_title: "AirPods Pro — 70% Off!",
      action_value_sats: 80000,
    },
  },
  {
    category: "shopping_scam",
    claim: "Decide whether this Apple Store checkout is safe for an automated purchase.",
    known_verdict: "safe",
    escrow_sats: 36,
    stake_sats: 2,
    context: {
      url: "https://apple.com/shop",
      page_title: "Apple Store",
      action_value_sats: 120000,
    },
  },
  {
    category: "code_security",
    claim: "Decide whether the coding agent should execute this install script.",
    known_verdict: "unsafe",
    escrow_sats: 64,
    stake_sats: 4,
    context: {
      url: "https://fast-auth-tools.example/install.sh",
      page_title: "One-line install script",
      action_value_sats: 50000,
    },
  },
  {
    category: "source_check",
    claim: "Decide whether the research agent should cite this breaking-news source.",
    known_verdict: "unsafe",
    escrow_sats: 30,
    stake_sats: 2,
    context: {
      url: "https://worldbreaking-news-now.example/story/mega-deal",
      page_title: "Exclusive leak: emergency market-moving story",
      action_value_sats: 15000,
    },
  },
];

async function postJson(path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const shouldBroadcast = process.argv.includes("--broadcast");
  const created: string[] = [];

  for (const challenge of DEMO_CHALLENGES) {
    const result = await postJson("/api/arena/challenges", challenge) as { challenge_id: string };
    created.push(result.challenge_id);
    console.log(`[demo] posted ${challenge.category}: ${result.challenge_id}`);
  }

  if (shouldBroadcast) {
    for (const id of created) {
      console.log(`[demo] broadcasting ${id}`);
      await postJson(`/api/arena/${id}/broadcast`);
    }
  }

  console.log(`[demo] created ${created.length} challenge market${created.length === 1 ? "" : "s"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
