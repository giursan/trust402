"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Award, ChevronLeft, Shield, Trophy, Wallet, Zap } from "lucide-react";

type Solver = {
  rank: number;
  verifier_id: string;
  name: string;
  type: string;
  categories: string[];
  arena_score: number;
  arena_attempts: number;
  graduated: boolean;
  reputation: number;
  min_price_sats: number;
  stake_sats: number;
  total_payout_sats: number;
  payout_count: number;
  correct_count: number;
  win_rate: number;
  last_verdict: string | null;
  last_correct: boolean | null;
  recent_results: {
    verdict: string;
    confidence: number;
    correct: boolean;
    score_awarded: number;
    created_at: string;
  }[];
};

function scoreTone(score: number) {
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-600";
  return "text-gray-500";
}

export default function ArenaLeaderboardPage() {
  const [solvers, setSolvers] = useState<Solver[]>([]);

  const fetchSolvers = useCallback(async () => {
    try {
      const res = await fetch("/api/arena/leaderboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setSolvers(data.leaderboard ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchSolvers();
    });
    const interval = setInterval(fetchSolvers, 5000);
    return () => clearInterval(interval);
  }, [fetchSolvers]);

  const totalPaid = solvers.reduce((sum, solver) => sum + solver.total_payout_sats, 0);
  const activeSolvers = solvers.filter((solver) => solver.arena_attempts > 0).length;
  const avgWinRate = activeSolvers > 0
    ? solvers.filter((solver) => solver.arena_attempts > 0).reduce((sum, solver) => sum + solver.win_rate, 0) / activeSolvers
    : 0;
  const topSolver = solvers[0];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <header className="border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-950">Trust402</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Solver Leaderboard</span>
          </div>
          <Link href="/arena" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
            <ChevronLeft className="h-3.5 w-3.5" />
            Marketplace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={Wallet} label="Rewards Paid" value={`${totalPaid}s`} />
          <Metric icon={Shield} label="Active Solvers" value={activeSolvers} />
          <Metric icon={Award} label="Avg Win Rate" value={`${Math.round(avgWinRate * 100)}%`} />
          <Metric icon={Zap} label="Top Solver" value={topSolver?.name ?? "none"} />
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Solver Market Rankings</div>
            <div className="mt-1 text-lg font-semibold text-gray-950">Rewards, accuracy, rating, and specialization</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400">
                  <th className="px-4 py-3 text-left font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold">Solver</th>
                  <th className="px-4 py-3 text-right font-semibold">Rating</th>
                  <th className="px-4 py-3 text-right font-semibold">Reputation</th>
                  <th className="px-4 py-3 text-right font-semibold">Win Rate</th>
                  <th className="px-4 py-3 text-right font-semibold">Attempts</th>
                  <th className="px-4 py-3 text-right font-semibold">Rewards</th>
                  <th className="px-4 py-3 text-left font-semibold">Recent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {solvers.map((solver) => (
                  <tr key={solver.verifier_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {solver.rank}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-950">{solver.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {solver.categories.slice(0, 3).map((category) => (
                          <span key={category} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                            {category}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={`px-4 py-4 text-right text-lg font-bold ${scoreTone(solver.arena_score)}`}>
                      {solver.arena_score.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700">{solver.reputation.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-700">{Math.round(solver.win_rate * 100)}%</td>
                    <td className="px-4 py-4 text-right text-gray-600">{solver.arena_attempts}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-amber-600">{solver.total_payout_sats}s</div>
                      <div className="text-xs text-gray-400">{solver.payout_count} payouts</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {solver.recent_results.slice(0, 6).map((result, index) => (
                          <span
                            key={`${solver.verifier_id}_${index}`}
                            className={`h-2.5 w-2.5 rounded-full ${result.correct ? "bg-emerald-500" : "bg-red-400"}`}
                            title={`${result.verdict} ${result.correct ? "correct" : "wrong"}`}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 truncate text-2xl font-bold text-gray-950">{value}</div>
    </div>
  );
}
