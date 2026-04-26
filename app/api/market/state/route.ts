import { prisma } from "@/lib/db";
import { getAllCategories } from "@/lib/market";

export async function GET() {
  try {
    const categories = getAllCategories();

    const recentEvents = await prisma.marketEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Top sellers by total payout sats
    const payoutAggregates = await prisma.payout.groupBy({
      by: ["verifierId"],
      _sum: { amountSats: true },
      orderBy: { _sum: { amountSats: "desc" } },
      take: 10,
    });

    const verifierIds = payoutAggregates.map((p) => p.verifierId);
    const verifiers = await prisma.verifier.findMany({
      where: { id: { in: verifierIds } },
    });

    const verifierMap = Object.fromEntries(verifiers.map((v) => [v.id, v]));

    const topSellers = payoutAggregates.map((p) => {
      const v = verifierMap[p.verifierId];
      return {
        verifier_id: p.verifierId,
        name: v?.name ?? "unknown",
        type: v?.type ?? "TOOL_AGENT",
        reputation: v?.reputation ?? 0,
        earned_sats: p._sum.amountSats ?? 0,
        is_online: v?.isOnline ?? false,
      };
    });

    return Response.json({
      categories,
      recent_events: recentEvents.map((e) => ({
        id: e.id,
        type: e.type,
        category: e.category,
        task_id: e.taskId,
        payload: JSON.parse(e.payloadJson),
        created_at: e.createdAt,
      })),
      top_sellers: topSellers,
    });
  } catch (err) {
    console.error("Market state error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
