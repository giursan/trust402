"use client";

import { Zap, TrendingUp } from "lucide-react";

type MarketTickerProps = {
  category: string;
  priceSats: number;
  demand: string;
  unsafeRate?: number;
};

export function MarketTicker({ category, priceSats, demand, unsafeRate }: MarketTickerProps) {
  const demandColor = demand === "high" ? "text-red-400" : demand === "medium" ? "text-yellow-400" : "text-emerald-400";
  const demandBg = demand === "high" ? "bg-red-500/10" : demand === "medium" ? "bg-yellow-500/10" : "bg-emerald-500/10";

  return (
    <div className="inline-flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2">
      <div className="text-xs text-zinc-500 font-mono">{category}</div>
      <div className="flex items-center gap-1">
        <Zap className="w-3 h-3 text-amber-400" />
        <span className="text-amber-400 text-xs font-semibold">{priceSats}</span>
      </div>
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${demandColor} ${demandBg}`}>
        <TrendingUp className="w-3 h-3" />
        {demand}
      </div>
      {unsafeRate !== undefined && (
        <div className="text-xs text-red-400">
          {Math.round(unsafeRate * 100)}% unsafe
        </div>
      )}
    </div>
  );
}
