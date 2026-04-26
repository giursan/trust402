import { prisma } from "@/lib/db";
import { getMarketState, incrDemand } from "@/lib/market";
import { buildRoutes } from "@/lib/routes";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyer_agent, claim, category, context, policy } = body;

    // Upsert BuyerAgent
    let buyerAgent = await prisma.buyerAgent.findFirst({ where: { id: buyer_agent.id } });
    if (!buyerAgent) {
      buyerAgent = await prisma.buyerAgent.create({
        data: {
          id: buyer_agent.id,
          name: buyer_agent.name,
          policyJson: JSON.stringify(policy),
        },
      });
    }

    // Create TrustTask
    const task = await prisma.trustTask.create({
      data: {
        buyerAgentId: buyerAgent.id,
        category,
        claim,
        contextJson: JSON.stringify(context),
        riskLevel: policy.risk_tolerance ?? "medium",
        maxBudgetSats: policy.max_budget_sats,
        deadlineSeconds: policy.deadline_seconds,
        minConfidence: policy.min_confidence,
        status: "QUOTED",
      },
    });

    // Get market state and build routes
    const market = getMarketState(category);
    const { routes, recommendedKey } = buildRoutes(market, policy, context.action_value_sats);

    // Create MarketQuote
    const quote = await prisma.marketQuote.create({
      data: {
        taskId: task.id,
        demandLevel: market.demandLevel,
        humanLiquidity: market.humanLiquidity,
        agentLiquidity: market.agentLiquidity,
        medianPriceSats: market.medianPriceSats,
        rushPremiumPct: market.rushPremiumPct,
      },
    });

    // Create RouteOptions
    const createdRoutes = [];
    for (const route of routes) {
      // Build seller plan
      const routeDef = (await import("@/lib/routes")).ROUTE_DEFINITIONS.find((d) => d.key === route.routeKey);
      const sellerPlan = routeDef
        ? routeDef.verifierKeys.map((k) => ({
            key: k,
            costSats: Math.round(route.priceSats / routeDef.verifierKeys.length),
            reputation: 0.85,
          }))
        : [];

      const created = await prisma.routeOption.create({
        data: {
          quoteId: quote.id,
          routeKey: route.routeKey,
          label: route.label,
          priceSats: route.priceSats,
          expectedConfidence: route.expectedConfidence,
          expectedLatencySeconds: route.expectedLatencySeconds,
          sellerPlanJson: JSON.stringify(sellerPlan),
          isRecommended: route.routeKey === recommendedKey,
        },
      });
      createdRoutes.push(created);
    }

    incrDemand(category, 3);

    return Response.json({
      task_id: task.id,
      quote_id: quote.id,
      market: {
        demand_level: market.demandLevel,
        median_price_sats: market.medianPriceSats,
        rush_premium_pct: market.rushPremiumPct,
      },
      routes: createdRoutes.map((r) => ({
        route_id: r.routeKey,
        label: r.label,
        price_sats: r.priceSats,
        expected_confidence: r.expectedConfidence,
        expected_latency_seconds: r.expectedLatencySeconds,
        is_recommended: r.isRecommended,
      })),
      recommended_route: recommendedKey,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error("Quote error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
