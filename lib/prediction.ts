import { prisma } from "./db";
import { emit, emitGlobal } from "./events";

type Position = {
  bettorId: string;
  bettorName: string;
  predictedVerdict: string;
  amountSats: number;
  timestamp: number;
};

type ActiveMarket = {
  taskId: string;
  positions: Position[];
  closesAt: number;
  status: "OPEN" | "CLOSED" | "RESOLVED";
};

const activeMarkets = new Map<string, ActiveMarket>();

/**
 * Open a prediction market for a task.
 */
export async function openMarket(taskId: string, durationMs = 10000) {
  const closesAt = Date.now() + durationMs;
  const market: ActiveMarket = {
    taskId,
    positions: [],
    closesAt,
    status: "OPEN",
  };
  activeMarkets.set(taskId, market);

  await prisma.predictionMarket.create({
    data: {
      taskId,
      status: "OPEN",
      closesAt: new Date(closesAt),
      totalPoolSats: 0,
    },
  });

  emit(taskId, "prediction_market_opened", {
    task_id: taskId,
    closes_at: new Date(closesAt).toISOString(),
    duration_ms: durationMs,
  });

  emitGlobal("prediction_market_opened", {
    task_id: taskId,
    closes_at: new Date(closesAt).toISOString(),
  });

  return market;
}

/**
 * Place a bet on a prediction market.
 */
export async function placeBet(
  taskId: string,
  bettorId: string,
  bettorName: string,
  predictedVerdict: string,
  amountSats: number
): Promise<{ accepted: boolean; reason?: string }> {
  const market = activeMarkets.get(taskId);
  if (!market) return { accepted: false, reason: "Market not found" };
  if (market.status !== "OPEN") return { accepted: false, reason: "Market closed" };
  if (Date.now() > market.closesAt) return { accepted: false, reason: "Market expired" };
  if (amountSats < 1 || amountSats > 5) return { accepted: false, reason: "Bet must be 1-5 sats" };

  const position: Position = {
    bettorId,
    bettorName,
    predictedVerdict,
    amountSats,
    timestamp: Date.now(),
  };

  market.positions.push(position);

  // Persist to DB
  const dbMarket = await prisma.predictionMarket.findUnique({ where: { taskId } });
  if (dbMarket) {
    await prisma.predictionPosition.create({
      data: {
        marketId: dbMarket.id,
        bettorId,
        bettorName,
        predictedVerdict,
        amountSats,
      },
    });
    await prisma.predictionMarket.update({
      where: { id: dbMarket.id },
      data: { totalPoolSats: { increment: amountSats } },
    });
  }

  const distribution = getDistribution(market);

  emit(taskId, "bet_received", {
    bettor_id: bettorId,
    bettor_name: bettorName,
    predicted_verdict: predictedVerdict,
    amount_sats: amountSats,
    distribution,
    total_pool: market.positions.reduce((s, p) => s + p.amountSats, 0),
  });

  emitGlobal("bet_received", {
    task_id: taskId,
    bettor_name: bettorName,
    predicted_verdict: predictedVerdict,
    amount_sats: amountSats,
  });

  return { accepted: true };
}

/**
 * Close a market and aggregate results.
 */
export function closeMarket(taskId: string) {
  const market = activeMarkets.get(taskId);
  if (!market) return null;

  market.status = "CLOSED";
  const distribution = getDistribution(market);
  const totalSats = market.positions.reduce((s, p) => s + p.amountSats, 0);

  // Winner = verdict with most sats
  let maxVerdict = "unknown";
  let maxSats = 0;
  for (const [verdict, sats] of Object.entries(distribution)) {
    if (sats > maxSats) {
      maxSats = sats;
      maxVerdict = verdict;
    }
  }

  const confidence = totalSats > 0 ? maxSats / totalSats : 0;

  return {
    aggregatedVerdict: maxVerdict,
    confidence: Math.min(0.75, confidence), // cap at route_zero max
    distribution,
    totalPoolSats: totalSats,
    positionCount: market.positions.length,
  };
}

/**
 * Resolve a market against the actual verdict and distribute rewards.
 */
export async function resolveMarket(taskId: string, actualVerdict: string) {
  const market = activeMarkets.get(taskId);
  if (!market) return null;

  market.status = "RESOLVED";

  const winners = market.positions.filter((p) => p.predictedVerdict === actualVerdict);
  const losers = market.positions.filter((p) => p.predictedVerdict !== actualVerdict);
  const winnerPool = winners.reduce((s, p) => s + p.amountSats, 0);
  const loserPool = losers.reduce((s, p) => s + p.amountSats, 0);

  // Update DB
  const dbMarket = await prisma.predictionMarket.findUnique({ where: { taskId } });
  if (dbMarket) {
    await prisma.predictionMarket.update({
      where: { id: dbMarket.id },
      data: { status: "RESOLVED", resolvedVerdict: actualVerdict },
    });
  }

  emit(taskId, "prediction_market_resolved", {
    task_id: taskId,
    actual_verdict: actualVerdict,
    winner_count: winners.length,
    loser_count: losers.length,
    winner_pool_sats: winnerPool,
    loser_pool_sats: loserPool,
  });

  emitGlobal("prediction_market_resolved", {
    task_id: taskId,
    actual_verdict: actualVerdict,
    winner_count: winners.length,
  });

  // Clean up
  activeMarkets.delete(taskId);

  return {
    actual_verdict: actualVerdict,
    winners: winners.map((w) => ({ bettor_id: w.bettorId, bettor_name: w.bettorName, amount_sats: w.amountSats })),
    losers: losers.map((l) => ({ bettor_id: l.bettorId, bettor_name: l.bettorName, amount_sats: l.amountSats })),
    winner_pool_sats: winnerPool,
    loser_pool_sats: loserPool,
  };
}

/**
 * Get current market state.
 */
export function getMarketStateForTask(taskId: string) {
  const market = activeMarkets.get(taskId);
  if (!market) return null;

  const distribution = getDistribution(market);
  const totalSats = market.positions.reduce((s, p) => s + p.amountSats, 0);

  return {
    task_id: taskId,
    status: market.status,
    closes_at: new Date(market.closesAt).toISOString(),
    time_remaining_ms: Math.max(0, market.closesAt - Date.now()),
    positions: market.positions.map((p) => ({
      bettor_id: p.bettorId,
      bettor_name: p.bettorName,
      predicted_verdict: p.predictedVerdict,
      amount_sats: p.amountSats,
    })),
    distribution,
    total_pool_sats: totalSats,
  };
}

function getDistribution(market: ActiveMarket): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const p of market.positions) {
    dist[p.predictedVerdict] = (dist[p.predictedVerdict] ?? 0) + p.amountSats;
  }
  return dist;
}
