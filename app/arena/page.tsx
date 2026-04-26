"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Radio,
  Trophy,
  Zap,
} from "lucide-react";

type Consensus = {
  verdict: string;
  confidence: number;
  finality: number;
  disagreement: boolean;
  state: string;
};

type ChallengeResult = {
  verifier_id: string;
  verifier_name: string;
  verifier_type: string;
  verdict: string;
  confidence: number;
  correct: boolean;
  score_awarded: number;
  evidence: string[];
  created_at: string;
};

type Challenge = {
  id: string;
  category: string;
  claim: string;
  context: Record<string, unknown>;
  status: string;
  result_count: number;
  reward_paid_sats: number;
  escrow_sats: number;
  stake_sats: number;
  slashed_sats: number;
  market_price_sats: number;
  market_demand_level: string;
  consensus: Consensus | null;
  results: ChallengeResult[];
  created_at: string;
};

type LeaderboardEntry = {
  verifier_id: string;
  name: string;
  arena_score: number;
  arena_attempts: number;
  reputation: number;
};

type FeedItem = {
  id: string;
  type: string;
  challenge_id?: string;
  submissions?: number;
  correct_count?: number;
  total_reward_sats?: number;
  escrow_sats?: number;
  stake_sats?: number;
  slashed_sats?: number;
  reward_pool_sats?: number;
  price_before_sats?: number;
  price_after_sats?: number;
  consensus_verdict?: string;
  consensus_confidence?: number;
  disagreement?: boolean;
  created_at: string;
};

function urlOf(challenge: Challenge) {
  return typeof challenge.context.url === "string" ? challenge.context.url : "";
}

function verdictClass(verdict?: string) {
  if (verdict === "safe") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (verdict === "unsafe") return "border-red-200 bg-red-50 text-red-700";
  if (verdict === "suspicious") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

function statusOf(challenge: Challenge) {
  if (challenge.consensus) return "resolved";
  if (challenge.result_count > 0) return "forming";
  return "open";
}

export default function ArenaMarketplacePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundEvents, setRoundEvents] = useState<FeedItem[]>([]);
  const [filter, setFilter] = useState<"live" | "resolved" | "all">("live");
  const [recentlyResolved, setRecentlyResolved] = useState<Record<string, number>>({});

  const GRACE_PERIOD_MS = 10000;

  const fetchChallenges = useCallback(async () => {
    try {
      const res = await fetch("/api/arena/challenges", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const newChallenges = data.challenges ?? [];
      
      // Detect newly resolved challenges to start the grace period timer
      setChallenges((prev) => {
        const newlyResolvedIds: Record<string, number> = {};
        const now = Date.now();
        
        newChallenges.forEach((nc: Challenge) => {
          const old = prev.find(p => p.id === nc.id);
          if (old && statusOf(old) !== "resolved" && statusOf(nc) === "resolved") {
            newlyResolvedIds[nc.id] = now;
          }
        });

        if (Object.keys(newlyResolvedIds).length > 0) {
          setRecentlyResolved(prevRec => ({ ...prevRec, ...newlyResolvedIds }));
        }

        return newChallenges;
      });
    } catch {}
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/arena/leaderboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchChallenges();
      fetchLeaderboard();
    });
    const interval = setInterval(() => {
      fetchChallenges();
      fetchLeaderboard();
    }, 4000);

    // Cleanup recently resolved IDs after grace period
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setRecentlyResolved(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([id, timestamp]) => {
          if (now - timestamp > GRACE_PERIOD_MS) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [fetchChallenges, fetchLeaderboard]);

  useEffect(() => {
    const es = new EventSource("/api/events/global");
    const refreshEvents = ["arena_challenge_spawned", "arena_agent_submitted", "arena_round_resolved"];

    for (const type of refreshEvents) {
      es.addEventListener(type, (event: MessageEvent) => {
        const data = JSON.parse(event.data) as Omit<FeedItem, "id" | "type" | "created_at">;
        if (type === "arena_round_resolved") {
          setRoundEvents((prev) => [
            {
              id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              type,
              created_at: new Date().toISOString(),
              ...data,
            },
            ...prev,
          ].slice(0, 8));
        }
        fetchChallenges();
        fetchLeaderboard();
      });
    }

    return () => es.close();
  }, [fetchChallenges, fetchLeaderboard]);

  const visibleChallenges = challenges.filter((challenge) => {
    const state = statusOf(challenge);
    const isRecent = !!recentlyResolved[challenge.id];

    if (filter === "live") return state !== "resolved" || isRecent;
    if (filter === "resolved") return state === "resolved" && !isRecent;
    return true;
  });

  const openCount = challenges.filter((challenge) => statusOf(challenge) === "open").length;
  const formingCount = challenges.filter((challenge) => statusOf(challenge) === "forming").length;
  const resolvedCount = challenges.filter((challenge) => statusOf(challenge) === "resolved").length;
  const totalPaid = challenges.reduce((sum, challenge) => sum + challenge.reward_paid_sats, 0);
  const avgPrice = challenges.length > 0
    ? Math.round(challenges.reduce((sum, challenge) => sum + challenge.market_price_sats, 0) / challenges.length)
    : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <header className="border-b border-gray-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <span className="font-bold text-gray-950">Trust402</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Trust Marketplace</span>
          </div>
          <nav className="flex items-center gap-3 text-xs">
            <Link href="/arena/leaderboard" className="font-semibold text-gray-500 hover:text-gray-900">Leaderboard</Link>
            <Link href="/" className="font-semibold text-gray-400 hover:text-gray-700">&larr; Landing</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-6 py-6">
        <section className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950">
                <Radio className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-950">Trust Markets</h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    live
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">Challenge markets published by buyer agents over API.</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <HeaderMetric label="Open" value={openCount} />
              <HeaderMetric label="Forming" value={formingCount} />
              <HeaderMetric label="Resolved" value={resolvedCount} />
              <HeaderMetric label="Avg Ask" value={`${avgPrice}s`} />
              <HeaderMetric label="Rewards" value={`${totalPaid}s`} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Market Board</div>
                <div className="mt-1 text-lg font-semibold text-gray-950">{visibleChallenges.length} challenge markets</div>
              </div>
              <div className="flex items-center gap-2">
                {(["live", "resolved", "all"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-full border px-4 py-2 text-xs font-semibold ${
                      filter === item ? "border-slate-950 bg-slate-950 text-white" : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleChallenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
              {visibleChallenges.length === 0 && (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-400 lg:col-span-2">
                  No markets in this filter. Publish demo challenges from the script.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Market Pulse</div>
              <div className="mt-4 space-y-3">
                <SideMetric label="Average Ask" value={`${avgPrice}s`} />
                <SideMetric label="Total Solvers" value={challenges.reduce((sum, challenge) => sum + challenge.result_count, 0)} />
                <SideMetric label="Reward Volume" value={`${totalPaid}s`} />
                <SideMetric label="Escrow Open" value={`${challenges.reduce((sum, challenge) => sum + (statusOf(challenge) === "resolved" ? 0 : challenge.escrow_sats), 0)}s`} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Top Solvers</div>
                <Link href="/arena/leaderboard" className="ml-auto text-xs font-semibold text-gray-500 hover:text-gray-900">View all</Link>
              </div>
              <div className="space-y-2">
                {leaderboard.slice(0, 6).map((entry, index) => (
                  <div key={entry.verifier_id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-500">{index + 1}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gray-900">{entry.name}</div>
                        <div className="text-xs text-gray-500">{entry.arena_attempts} attempts · rep {entry.reputation.toFixed(2)}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900">{entry.arena_score.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && <div className="text-sm text-gray-400">No solver payouts yet.</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Recent Rounds</div>
              <div className="space-y-2">
                {roundEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
                    <div className="font-semibold">{event.consensus_verdict ?? "unknown"} · {Math.round((event.consensus_confidence ?? 0) * 100)}%</div>
                    <div className="mt-1">{event.submissions} solvers · {event.total_reward_sats}s paid</div>
                    <div>pool {event.reward_pool_sats}s · slashed {event.slashed_sats}s</div>
                    <div>{event.price_before_sats}s → {event.price_after_sats}s</div>
                  </div>
                ))}
                {roundEvents.length === 0 && <div className="text-sm text-gray-400">Round economics appear after broadcasts.</div>}
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-gray-950">{value}</div>
    </div>
  );
}

function SideMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-950">{value}</div>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const state = statusOf(challenge);
  const consensus = challenge.consensus;
  const solverSnapshot = challenge.results.slice(0, 3).map((result) => ({
    id: result.verifier_id,
    label: result.verifier_name.replace("_agent", ""),
  }));

  return (
    <article className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{challenge.category}</span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              state === "resolved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
              state === "forming" ? "border-blue-200 bg-blue-50 text-blue-700" :
              "border-amber-200 bg-amber-50 text-amber-700"
            }`}>
              {state}
            </span>
          </div>
          <h2 className="text-lg font-bold leading-6 text-gray-950">{challenge.claim}</h2>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-right">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">Ask</div>
          <div className="text-lg font-bold text-amber-700">{challenge.market_price_sats}s</div>
        </div>
      </div>

      {urlOf(challenge) && (
        <div className="mb-4 truncate rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500">
          {urlOf(challenge)}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-500">Buyer Signal</div>
            <div className="mt-1 text-xl font-bold text-blue-950">{consensus ? consensus.verdict.toUpperCase() : "PENDING"}</div>
          </div>
          {consensus ? (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${verdictClass(consensus.verdict)}`}>
              {Math.round(consensus.confidence * 100)}%
            </span>
          ) : (
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500">awaiting solvers</span>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, (consensus?.finality ?? 0) * 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniMetric label="Escrow" value={`${challenge.escrow_sats}s`} />
        <MiniMetric label="Stake" value={`${challenge.stake_sats}s`} />
        <MiniMetric label="Paid" value={`${challenge.reward_paid_sats}s`} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <MiniMetric label="Solvers" value={challenge.result_count} />
        <MiniMetric label="Slashed" value={`${challenge.slashed_sats}s`} />
        <MiniMetric label="Demand" value={challenge.market_demand_level} />
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Solver Snapshot</span>
          {consensus?.disagreement && <span className="text-xs font-semibold text-amber-600">disagreement</span>}
        </div>
        {challenge.results.length === 0 ? (
          <div className="text-sm text-gray-400">No solver submissions yet.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {solverSnapshot.map((solver) => (
              <span key={`${challenge.id}_${solver.id}`} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600">
                {solver.label}
              </span>
            ))}
            {challenge.results.length > 3 && (
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">+{challenge.results.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 truncate text-sm font-bold text-gray-950">{value}</div>
    </div>
  );
}
