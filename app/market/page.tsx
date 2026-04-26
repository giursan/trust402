"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle,
  Clock3,
  Cpu,
  Shield,
  Sparkles,
  TrendingUp,
  User,
  Wallet,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERVICE_AGENT_DEFINITIONS } from "@/lib/verifiers/registry";

type CategoryData = {
  category: string;
  demandLevel: string;
  humanLiquidity: number;
  agentLiquidity: number;
  medianPriceSats: number;
  rushPremiumPct: number;
  unsafeRate: number;
  volume24hSats: number;
  priorConsensusStrength: number;
  noveltyScore: number;
};

type MarketEvent = {
  id: string;
  type: string;
  category: string;
  task_id?: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type TopSeller = {
  verifier_id: string;
  name: string;
  type: string;
  reputation: number;
  earned_sats: number;
  is_online: boolean;
};

type MarketState = {
  categories: CategoryData[];
  recent_events: MarketEvent[];
  top_sellers: TopSeller[];
};

type Snapshot = {
  timestamp: string;
  totalVolume: number;
  avgConsensus: number;
  avgNovelty: number;
  avgPrice: number;
  shopping_scam_price?: number;
  code_security_price?: number;
  legal_clause_price?: number;
  source_check_price?: number;
};

type ServiceAgentStatus = {
  key: string;
  label: string;
  port: number;
  online: boolean;
};

type PredictionMarketView = {
  task_id: string;
  status: "OPEN" | "RESOLVED";
  closes_at?: string;
  total_pool_sats: number;
  bet_count: number;
  distribution: Record<string, number>;
  resolved_verdict?: string;
};

type ArenaActivity = {
  id: string;
  type: string;
  category?: string;
  claim?: string;
  verifier_name?: string;
  correct?: boolean;
  score_awarded?: number;
  created_at: string;
};

type MarketScenario = {
  id: string;
  title: string;
  description: string;
  category: string;
  routePreference?: string;
  claim: string;
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

const SCENARIOS: MarketScenario[] = [
  {
    id: "browser-attack",
    title: "Unsafe Checkout",
    description: "Browser agent tries to pay an unknown merchant. Best judge-path demo.",
    category: "shopping_scam",
    routePreference: "balanced",
    claim: "Decide whether to pay discount-airpods-example.com for a suspicious checkout.",
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
  },
  {
    id: "code-release",
    title: "Code Execution Gate",
    description: "Code agent wants to run a one-line install script from an unknown source.",
    category: "code_security",
    routePreference: "balanced",
    claim: "Decide whether to execute fast-auth-tools.example/install.sh on a build server.",
    context: {
      url: "https://fast-auth-tools.example/install.sh",
      page_title: "Install script",
      action_value_sats: 60000,
    },
    policy: {
      max_budget_sats: 190,
      deadline_seconds: 60,
      min_confidence: 0.9,
      risk_tolerance: "low",
    },
  },
  {
    id: "contract-review",
    title: "Clause Acceptance",
    description: "Ops agent wants to accept vendor terms and needs higher-confidence review.",
    category: "legal_clause",
    routePreference: "balanced",
    claim: "Decide whether compliance-fastlane.example terms are safe to accept automatically.",
    context: {
      url: "https://compliance-fastlane.example/msa",
      page_title: "Master Service Agreement",
      action_value_sats: 120000,
    },
    policy: {
      max_budget_sats: 260,
      deadline_seconds: 180,
      min_confidence: 0.92,
      risk_tolerance: "low",
    },
  },
  {
    id: "source-rumor",
    title: "Source Check",
    description: "Research agent wants to cite a sensational source under time pressure.",
    category: "source_check",
    routePreference: "agent_fast",
    claim: "Decide whether worldbreaking-news-now.example is credible enough to cite.",
    context: {
      url: "https://worldbreaking-news-now.example/story/mega-deal",
      page_title: "Exclusive leak",
      action_value_sats: 15000,
    },
    policy: {
      max_budget_sats: 130,
      deadline_seconds: 45,
      min_confidence: 0.8,
      risk_tolerance: "medium",
    },
  },
];

function DemandBadge({ level }: { level: string }) {
  if (level === "high") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">high</span>
      </div>
    );
  }
  if (level === "medium") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
        <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">medium</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">low</span>
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  if (type === "task_completed") return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
  if (type === "price_spike") return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
  if (type === "disagreement_detected") return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
  if (type === "seller_payout") return <Zap className="w-3.5 h-3.5 text-amber-500" />;
  return <Activity className="w-3.5 h-3.5 text-blue-500" />;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function snapshotFromState(data: MarketState): Snapshot {
  const categories = data.categories;
  const totalVolume = categories.reduce((sum, category) => sum + category.volume24hSats, 0);
  const avgConsensus = categories.length > 0
    ? (categories.reduce((sum, category) => sum + category.priorConsensusStrength, 0) / categories.length) * 100
    : 0;
  const avgNovelty = categories.length > 0
    ? (categories.reduce((sum, category) => sum + category.noveltyScore, 0) / categories.length) * 100
    : 0;
  const avgPrice = categories.length > 0
    ? categories.reduce((sum, category) => sum + category.medianPriceSats, 0) / categories.length
    : 0;

  const byCategory = Object.fromEntries(categories.map((category) => [category.category, category.medianPriceSats]));
  return {
    timestamp: new Date().toLocaleTimeString(),
    totalVolume,
    avgConsensus: Math.round(avgConsensus),
    avgNovelty: Math.round(avgNovelty),
    avgPrice: Math.round(avgPrice),
    shopping_scam_price: byCategory.shopping_scam,
    code_security_price: byCategory.code_security,
    legal_clause_price: byCategory.legal_clause,
    source_check_price: byCategory.source_check,
  };
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function MarketPage() {
  const [data, setData] = useState<MarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("shopping_scam");
  const [simulationStatus, setSimulationStatus] = useState("Idle");
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [completedRuns, setCompletedRuns] = useState(0);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [lastOutcome, setLastOutcome] = useState<{ verdict?: string; confidence?: number; scenario?: string } | null>(null);
  const [predictionMarkets, setPredictionMarkets] = useState<PredictionMarketView[]>([]);
  const [arenaActivity, setArenaActivity] = useState<ArenaActivity[]>([]);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceAgentStatus[]>(
    SERVICE_AGENT_DEFINITIONS.map((agent) => ({
      key: agent.key,
      label: agent.label,
      port: agent.port,
      online: false,
    }))
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/market/state", { cache: "no-store" });
      if (res.ok) {
        const json: MarketState = await res.json();
        setData(json);
        setLastUpdated(new Date());
        setHistory((prev) => {
          const next = [...prev, snapshotFromState(json)];
          return next.slice(-18);
        });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      fetchData();
    });
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const es = new EventSource("/api/events/global");

    es.addEventListener("prediction_market_opened", (event: MessageEvent) => {
      const data = JSON.parse(event.data) as { task_id: string; closes_at: string };
      setPredictionMarkets((prev) => [
        {
          task_id: data.task_id,
          status: "OPEN" as const,
          closes_at: data.closes_at,
          total_pool_sats: 0,
          bet_count: 0,
          distribution: {},
        },
        ...prev.filter((market) => market.task_id !== data.task_id),
      ].slice(0, 6));
    });

    es.addEventListener("bet_received", (event: MessageEvent) => {
      const data = JSON.parse(event.data) as {
        task_id: string;
        predicted_verdict: string;
        amount_sats: number;
      };
      setPredictionMarkets((prev) => prev.map((market) => {
        if (market.task_id !== data.task_id) return market;
        return {
          ...market,
          total_pool_sats: market.total_pool_sats + data.amount_sats,
          bet_count: market.bet_count + 1,
          distribution: {
            ...market.distribution,
            [data.predicted_verdict]: (market.distribution[data.predicted_verdict] ?? 0) + data.amount_sats,
          },
        };
      }));
    });

    es.addEventListener("prediction_market_resolved", (event: MessageEvent) => {
      const data = JSON.parse(event.data) as { task_id: string; actual_verdict: string };
      setPredictionMarkets((prev) => prev.map((market) => (
        market.task_id === data.task_id
          ? { ...market, status: "RESOLVED", resolved_verdict: data.actual_verdict }
          : market
      )));
    });

    es.addEventListener("arena_challenge_spawned", (event: MessageEvent) => {
      const data = JSON.parse(event.data) as { challenge_id: string; category: string; claim: string };
      setArenaActivity((prev) => [
        {
          id: data.challenge_id,
          type: "challenge_spawned",
          category: data.category,
          claim: data.claim,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 8));
    });

    es.addEventListener("arena_result", (event: MessageEvent) => {
      const data = JSON.parse(event.data) as {
        challenge_id: string;
        verifier_name: string;
        correct: boolean;
        score_awarded: number;
      };
      setArenaActivity((prev) => [
        {
          id: `${data.challenge_id}_${Date.now()}`,
          type: "result_submitted",
          verifier_name: data.verifier_name,
          correct: data.correct,
          score_awarded: data.score_awarded,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 8));
    });

    return () => es.close();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probeAgents() {
      const statuses = await Promise.all(
        SERVICE_AGENT_DEFINITIONS.map(async (agent) => {
          try {
            const res = await fetch(`http://127.0.0.1:${agent.port}/health`);
            return {
              key: agent.key,
              label: agent.label,
              port: agent.port,
              online: res.ok,
            };
          } catch {
            return {
              key: agent.key,
              label: agent.label,
              port: agent.port,
              online: false,
            };
          }
        })
      );
      if (!cancelled) setServiceStatuses(statuses);
    }

    probeAgents();
    const interval = setInterval(probeAgents, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const runScenario = useCallback(async (scenario: MarketScenario) => {
    setSimulationRunning(true);
    setSimulationStatus(`Quoting trust route for ${scenario.title}...`);
    try {
      const quoteRes = await fetch("/api/trust/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_agent: { id: `market_sim_${scenario.id}_${Date.now()}`, name: `MarketSim-${scenario.id}` },
          claim: scenario.claim,
          category: scenario.category,
          context: scenario.context,
          policy: scenario.policy,
        }),
      });
      if (!quoteRes.ok) throw new Error(await quoteRes.text());
      const quote = await quoteRes.json();
      const routes = quote.routes ?? [];
      const chosenRoute =
        routes.find((route: { route_id: string }) => route.route_id === scenario.routePreference)?.route_id ??
        quote.recommended_route ??
        routes[0]?.route_id;

      setSimulationStatus(`Locking route ${chosenRoute} for ${scenario.title}...`);
      const selectRes = await fetch(`/api/trust/${quote.task_id}/select-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route_id: chosenRoute }),
      });
      if (!selectRes.ok) throw new Error(await selectRes.text());

      setSimulationStatus("Settling Lightning payment...");
      await fetch("/api/payments/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: quote.task_id }),
      });

      setSimulationStatus("Executing consensus route...");
      const executeRes = await fetch(`/api/trust/${quote.task_id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!executeRes.ok) throw new Error(await executeRes.text());
      const execute = await executeRes.json();

      if (execute.status !== "COMPLETED") {
        setSimulationStatus("Consensus route requires human review. Simulating reviewer...");
        await fetch("/api/reviewer/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: quote.task_id }),
        });
      }

      setSimulationStatus("Waiting for trust proof...");
      let proof: { verdict?: string; confidence?: number } | null = null;
      for (let attempt = 0; attempt < 14; attempt += 1) {
        await wait(1300);
        const proofRes = await fetch(`/api/trust/${quote.task_id}/proof`, { cache: "no-store" });
        if (proofRes.ok) {
          proof = await proofRes.json();
          break;
        }
      }

      setCompletedRuns((prev) => prev + 1);
      setLastOutcome({
        verdict: proof?.verdict,
        confidence: proof?.confidence,
        scenario: scenario.title,
      });
      setSimulationStatus(`Completed ${scenario.title}. Verdict: ${(proof?.verdict ?? "unknown").toUpperCase()}`);
      await fetchData();
    } catch (error) {
      setSimulationStatus(`Simulation failed: ${String(error)}`);
    } finally {
      setSimulationRunning(false);
    }
  }, [fetchData]);

  const runMarketWave = useCallback(async () => {
    if (simulationRunning) return;
    setSimulationRunning(true);
    setSimulationStatus("Running coordinated market wave...");
    try {
      for (const scenario of SCENARIOS) {
        await runScenario(scenario);
        await wait(600);
      }
      setSimulationStatus("Market wave completed.");
    } finally {
      setSimulationRunning(false);
    }
  }, [runScenario, simulationRunning]);

  const injectDemandSpike = useCallback(async () => {
    if (simulationRunning) return;
    setSimulationRunning(true);
    setSimulationStatus("Injecting demand spike into shopping_scam...");
    try {
      for (let i = 0; i < 3; i += 1) {
        await fetch("/api/trust/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buyer_agent: { id: `spike_agent_${Date.now()}_${i}`, name: "DemandSpiker" },
            claim: "Check trustworthiness of fake-store.example.com",
            category: "shopping_scam",
            context: { url: "https://fake-store.example.com", action_value_sats: 50000 },
            policy: { max_budget_sats: 200, deadline_seconds: 60, min_confidence: 0.8, risk_tolerance: "medium" },
          }),
        });
      }
      await fetchData();
      setSimulationStatus("Demand spike injected.");
    } finally {
      setSimulationRunning(false);
    }
  }, [fetchData, simulationRunning]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-gray-500 text-sm">Loading market simulation...</div>
        </div>
      </div>
    );
  }

  const cats = data?.categories ?? [];
  const events = data?.recent_events ?? [];
  const sellers = data?.top_sellers ?? [];
  const selectedCategoryData = cats.find((category) => category.category === selectedCategory) ?? cats[0];
  const totalVolume = cats.reduce((sum, category) => sum + category.volume24hSats, 0);
  const onlineSellers = sellers.filter((seller) => seller.is_online).length;
  const avgConsensus = cats.length > 0
    ? Math.round((cats.reduce((sum, category) => sum + category.priorConsensusStrength, 0) / cats.length) * 100)
    : 0;
  const avgNovelty = cats.length > 0
    ? Math.round((cats.reduce((sum, category) => sum + category.noveltyScore, 0) / cats.length) * 100)
    : 0;

  const categoryChartData = cats.map((category) => ({
    name: category.category.replace(/_/g, " "),
    price: category.medianPriceSats,
    consensus: Math.round(category.priorConsensusStrength * 100),
    novelty: Math.round(category.noveltyScore * 100),
  }));

  const selectedCategoryHistory = history.map((point) => ({
    timestamp: point.timestamp,
    price:
      selectedCategory === "shopping_scam" ? point.shopping_scam_price :
      selectedCategory === "code_security" ? point.code_security_price :
      selectedCategory === "legal_clause" ? point.legal_clause_price :
      point.source_check_price,
  }));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_100%)]">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Trust402</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 text-sm">Consensus Market Lab</span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className={`w-2 h-2 rounded-full ${simulationRunning ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <span className={`text-xs font-semibold ${simulationRunning ? "text-amber-600" : "text-emerald-600"}`}>
                {simulationRunning ? "SIMULATING" : "LIVE"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back</Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Demo Command Center</div>
                <div className="mt-1 text-2xl font-bold text-gray-950">Drive the market, then watch consensus react</div>
              </div>
              <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Fully demoable
              </div>
            </div>
            <p className="text-sm leading-6 text-gray-600 max-w-3xl">
              This surface lets you replay realistic agent actions, inject demand spikes, and watch how price, consensus, novelty, volume, verifier rewards, and seller rankings move together over time.
            </p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  disabled={simulationRunning}
                  onClick={() => runScenario(scenario)}
                  className="rounded-2xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-gray-300 text-left p-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-semibold text-gray-900">{scenario.title}</div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-500">
                      {scenario.category}
                    </span>
                  </div>
                  <div className="text-sm leading-6 text-gray-600">{scenario.description}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runMarketWave}
                disabled={simulationRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-4 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                Run Full Market Wave
              </button>
              <button
                type="button"
                onClick={injectDemandSpike}
                disabled={simulationRunning}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold px-4 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <TrendingUp className="w-4 h-4" />
                Inject Demand Spike
              </button>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white shadow-[0_24px_64px_-32px_rgba(15,23,42,0.55)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 mb-3">Simulation Status</div>
            <div className="text-xl font-semibold leading-8">{simulationStatus}</div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Completed Runs</div>
                <div className="mt-2 text-3xl font-bold text-white">{completedRuns}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-400">Online Sellers</div>
                <div className="mt-2 text-3xl font-bold text-white">{onlineSellers}</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Last Outcome</div>
              {lastOutcome ? (
                <div className="mt-2 space-y-1">
                  <div className="text-sm font-semibold text-white">{lastOutcome.scenario}</div>
                  <div className="text-sm text-slate-300">
                    {String(lastOutcome.verdict ?? "unknown").toUpperCase()} · {Math.round((lastOutcome.confidence ?? 0) * 100)}% confidence
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-400">Run a scenario to capture an outcome.</div>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">Mechanism Thesis</div>
              <div className="mt-2 text-sm leading-6 text-slate-200">
                Consensus compresses cost. Uncertainty expands cost. The market pays for independent action consensus before autonomous execution.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "24h Volume",
              value: totalVolume,
              unit: "sats",
              icon: Wallet,
              iconColor: "text-amber-500",
              iconBg: "bg-amber-50",
            },
            {
              label: "Consensus Strength",
              value: avgConsensus,
              unit: "%",
              icon: Shield,
              iconColor: "text-emerald-500",
              iconBg: "bg-emerald-50",
            },
            {
              label: "Novelty Index",
              value: avgNovelty,
              unit: "%",
              icon: Sparkles,
              iconColor: "text-orange-500",
              iconBg: "bg-orange-50",
            },
            {
              label: "Recent Events",
              value: events.length,
              unit: "",
              icon: Activity,
              iconColor: "text-blue-500",
              iconBg: "bg-blue-50",
            },
          ].map(({ label, value, unit, icon: Icon, iconColor, iconBg }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-2xl font-bold text-gray-900 leading-none">{value}</span>
                {unit && <span className="text-xs text-gray-400 mb-0.5">{unit}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Prediction Markets</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">Route Zero micro-bet flow</div>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Global SSE
              </span>
            </div>
            {predictionMarkets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                Select Route Zero in the Agent Demo to open a live prediction market.
              </div>
            ) : (
              <div className="space-y-3">
                {predictionMarkets.map((market) => {
                  const total = Math.max(1, market.total_pool_sats);
                  return (
                    <div key={market.task_id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-xs text-gray-500">{market.task_id}</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">
                            {market.bet_count} bets · {market.total_pool_sats} sats
                          </div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          market.status === "OPEN"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-blue-200 bg-blue-50 text-blue-700"
                        }`}>
                          {market.status === "OPEN" ? "open" : `resolved ${market.resolved_verdict}`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {["safe", "suspicious", "unsafe"].map((verdictKey) => {
                          const sats = market.distribution[verdictKey] ?? 0;
                          return (
                            <div key={verdictKey}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-semibold uppercase text-gray-500">{verdictKey}</span>
                                <span className="font-bold text-gray-900">{sats}s</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-white">
                                <div
                                  className={`h-full rounded-full ${
                                    verdictKey === "safe" ? "bg-emerald-500" : verdictKey === "unsafe" ? "bg-red-500" : "bg-amber-500"
                                  }`}
                                  style={{ width: `${(sats / total) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Arena Activity</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">Challenges and scorer results</div>
              </div>
              <Link href="/arena" className="text-xs font-semibold text-red-600 hover:text-red-700">Open Arena</Link>
            </div>
            {arenaActivity.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                Complete a verification or submit an arena answer to populate this feed.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {arenaActivity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className={`h-8 w-8 flex-shrink-0 rounded-xl flex items-center justify-center ${
                      item.type === "challenge_spawned" ? "bg-red-50" : item.correct ? "bg-emerald-50" : "bg-amber-50"
                    }`}>
                      {item.type === "challenge_spawned"
                        ? <Zap className="h-4 w-4 text-red-500" />
                        : item.correct
                        ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                        : <AlertTriangle className="h-4 w-4 text-amber-500" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {item.type === "challenge_spawned" ? "Challenge spawned" : `${item.verifier_name} submitted result`}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {item.claim ?? `${item.correct ? "correct" : "wrong"} · score ${item.score_awarded?.toFixed(2)}`}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">{timeAgo(item.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Local Service Mesh</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">Ten verifier agents on different localhost ports</div>
            </div>
            <div className="text-xs text-gray-400">Start with `pnpm agent-network`</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {serviceStatuses.map((agent) => (
              <div key={agent.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs font-semibold text-gray-800">{agent.label}</div>
                  <span className={`w-2 h-2 rounded-full ${agent.online ? "bg-emerald-500" : "bg-red-400"}`} />
                </div>
                <div className="text-xs text-gray-500 font-mono">{agent.key}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">127.0.0.1:{agent.port}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    agent.online
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-600"
                  }`}>
                    {agent.online ? "online" : "offline"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">History Replay</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">Market response over time</div>
              </div>
              <div className="text-xs text-gray-400">Polled snapshots from the live market state</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="avgConsensus" name="Consensus %" stroke="#10b981" fill="#bbf7d0" fillOpacity={0.5} />
                  <Area type="monotone" dataKey="avgNovelty" name="Novelty %" stroke="#f97316" fill="#fed7aa" fillOpacity={0.45} />
                  <Line type="monotone" dataKey="avgPrice" name="Avg Price" stroke="#2563eb" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Current Category State</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">Price versus consensus versus novelty</div>
              </div>
              <div className="text-xs text-gray-400">Trust402 prices uncertainty</div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="price" name="Price (sats)" radius={[6, 6, 0, 0]}>
                    {categoryChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.consensus > entry.novelty ? "#10b981" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="consensus" name="Consensus %" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="novelty" name="Novelty %" stroke="#f97316" strokeWidth={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Category Drilldown</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">Replay one category</div>
              </div>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-300"
              >
                {cats.map((category) => (
                  <option key={category.category} value={category.category}>
                    {category.category}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Consensus</div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  {Math.round((selectedCategoryData?.priorConsensusStrength ?? 0) * 100)}%
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-gray-400">Novelty</div>
                <div className="mt-1 text-lg font-bold text-gray-900">
                  {Math.round((selectedCategoryData?.noveltyScore ?? 0) * 100)}%
                </div>
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedCategoryHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="price" name="Price (sats)" stroke="#0f172a" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Category Market Table</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">Live consensus market state</div>
              </div>
              <div className="text-xs text-gray-400">Updated automatically</div>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2.5 font-medium">Category</th>
                    <th className="text-left pb-2.5 font-medium pl-2">Demand</th>
                    <th className="text-right pb-2.5 font-medium">Consensus</th>
                    <th className="text-right pb-2.5 font-medium">Novelty</th>
                    <th className="text-right pb-2.5 font-medium">Price</th>
                    <th className="text-right pb-2.5 font-medium">Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cats.map((category) => (
                    <tr
                      key={category.category}
                      className={`hover:bg-gray-50 transition-colors ${selectedCategory === category.category ? "bg-blue-50/50" : ""}`}
                    >
                      <td className="py-3 font-mono text-xs text-gray-700 font-medium">{category.category}</td>
                      <td className="py-3 pl-2"><DemandBadge level={category.demandLevel} /></td>
                      <td className="py-3 text-right text-xs font-semibold text-emerald-700">{Math.round(category.priorConsensusStrength * 100)}%</td>
                      <td className="py-3 text-right text-xs font-semibold text-orange-600">{Math.round(category.noveltyScore * 100)}%</td>
                      <td className="py-3 text-right text-xs font-bold text-amber-600">{category.medianPriceSats}s</td>
                      <td className="py-3 text-right text-xs text-gray-500">{category.volume24hSats}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[0.92fr_1.08fr] gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 mb-4">Top Consensus Earners</div>
            {sellers.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">Run simulations to populate verifier earnings.</div>
            ) : (
              <div className="space-y-3">
                {sellers.map((seller, index) => (
                  <div key={seller.verifier_id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        {index + 1}
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${seller.type === "HUMAN" ? "bg-blue-100" : "bg-emerald-100"}`}>
                        {seller.type === "HUMAN"
                          ? <User className="w-4 h-4 text-blue-600" />
                          : <Cpu className="w-4 h-4 text-emerald-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{seller.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${seller.is_online ? "bg-emerald-500" : "bg-gray-300"}`} />
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${seller.reputation * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{seller.reputation.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Zap className="w-3 h-3" />
                        {seller.earned_sats}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <Activity className="w-4 h-4 text-blue-500" />
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Recent Market Events</div>
            </div>
            {events.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">No events yet. Run a scenario to animate the market.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {events.map((event) => {
                  const ageSeconds = lastUpdated
                    ? Math.floor((lastUpdated.getTime() - new Date(event.created_at).getTime()) / 1000)
                    : 999;
                  const isRecent = ageSeconds < 30;
                  return (
                    <div
                      key={event.id}
                      className={`flex items-center gap-3 py-3 px-2 rounded-lg transition-colors ${isRecent ? "bg-blue-50/50" : "hover:bg-gray-50"}`}
                    >
                      <div className="flex-shrink-0">
                        <EventIcon type={event.type} />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          event.type === "task_completed" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                          event.type === "seller_payout" ? "text-amber-700 bg-amber-50 border-amber-200" :
                          event.type === "disagreement_detected" ? "text-orange-700 bg-orange-50 border-orange-200" :
                          "text-blue-700 bg-blue-50 border-blue-200"
                        }`}>
                          {event.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded font-mono">
                          {event.category}
                        </span>
                        {typeof event.payload.verdict === "string" && (
                          <span className={`text-xs font-semibold ${
                            event.payload.verdict === "safe" ? "text-emerald-600" :
                            event.payload.verdict === "unsafe" ? "text-red-600" :
                            "text-yellow-600"
                          }`}>
                            {String(event.payload.verdict)}
                          </span>
                        )}
                        {typeof event.payload.consensus_finality === "number" && (
                          <span className="text-xs text-blue-600 font-semibold">
                            finality {Math.round(Number(event.payload.consensus_finality) * 100)}%
                          </span>
                        )}
                        {typeof event.payload.uncertainty === "number" && (
                          <span className="text-xs text-orange-600 font-semibold">
                            uncertainty {Math.round(Number(event.payload.uncertainty) * 100)}%
                          </span>
                        )}
                        {typeof event.payload.paid_sats === "number" && (
                          <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5">
                            <Zap className="w-3 h-3" />
                            {event.payload.paid_sats} sats
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isRecent && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                        <span className="text-xs text-gray-400">{timeAgo(event.created_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">How To Demo This</div>
              <div className="text-sm text-gray-600 mt-1">
                Run `Unsafe Checkout`, then `Run Full Market Wave`. Narrate how demand, novelty, consensus, payouts, and rankings move together.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                icon: Clock3,
                title: "Start With One Risky Action",
                body: "Show a browser agent hitting a suspicious payment boundary and explain that trust must be purchased before action.",
              },
              {
                icon: TrendingUp,
                title: "Then Stress The Market",
                body: "Inject demand and run a market wave so judges can watch prices, consensus, novelty, and seller rewards move live.",
              },
              {
                icon: Shield,
                title: "End On Consensus",
                body: "Point at finality, uncertainty, and payouts to explain this as incentivized action consensus, not just AI opinions.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-gray-700" />
                </div>
                <div className="text-sm font-semibold text-gray-900">{title}</div>
                <div className="mt-2 text-sm leading-6 text-gray-600">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
