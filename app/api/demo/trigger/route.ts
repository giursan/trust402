const DEFAULT_SCENARIO = {
  buyer_agent: { id: "demo_trigger_agent", name: "DemoTriggerAgent" },
  claim: "Decide whether to pay discount-airpods-example.com for a suspicious checkout.",
  category: "shopping_scam",
  context: {
    url: "https://discount-airpods-example.com/checkout",
    page_title: "AirPods Pro — Limited Sale",
    action_value_sats: 80000,
  },
  policy: {
    max_budget_sats: 220,
    deadline_seconds: 90,
    min_confidence: 0.88,
    risk_tolerance: "low",
  },
};

type DemoAction = "quote" | "select" | "pay" | "execute" | "arena_challenge";

async function forwardJson(origin: string, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return Response.json(json, { status: res.status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action as DemoAction | undefined;
    const origin = new URL(req.url).origin;

    if (!action) {
      return Response.json({ error: "action required" }, { status: 400 });
    }

    if (action === "quote") {
      return forwardJson(origin, "/api/trust/quote", {
        ...DEFAULT_SCENARIO,
        ...(body.scenario ?? {}),
      });
    }

    if (action === "select") {
      if (!body.task_id) return Response.json({ error: "task_id required" }, { status: 400 });
      return forwardJson(origin, `/api/trust/${body.task_id}/select-route`, {
        route_id: body.route_id ?? "balanced",
      });
    }

    if (action === "pay") {
      if (!body.task_id) return Response.json({ error: "task_id required" }, { status: 400 });
      return forwardJson(origin, "/api/payments/settle", {
        task_id: body.task_id,
        payment_hash: body.payment_hash,
        force_mock_settle: body.force_mock_settle,
      });
    }

    if (action === "execute") {
      if (!body.task_id) return Response.json({ error: "task_id required" }, { status: 400 });
      return forwardJson(origin, `/api/trust/${body.task_id}/execute`, {
        payment_proof: body.payment_proof,
      });
    }

    if (action === "arena_challenge") {
      if (!body.task_id) return Response.json({ error: "task_id required" }, { status: 400 });
      return forwardJson(origin, "/api/arena/spawn", {
        task_id: body.task_id,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("Demo trigger error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
