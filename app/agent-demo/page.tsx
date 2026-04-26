"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Lock,
  Play,
  Search,
  Shield,
  User,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import { RouteCard, RouteData } from "@/components/RouteCard";
import { VerificationStream } from "@/components/VerificationStream";
import { TrustProofCard, TrustProofData } from "@/components/TrustProofCard";

type AgentStep = { text: string; timestamp: Date };
type StreamEvent = { type: string; data: unknown; timestamp: Date };
type RouteOption = RouteData & { is_recommended?: boolean };
type DemoStep = "scenario" | "quoted" | "route_selected" | "paid" | "executing" | "complete";
type PredictionState = {
  status: string;
  time_remaining_ms: number;
  positions: {
    bettor_id: string;
    bettor_name: string;
    predicted_verdict: string;
    amount_sats: number;
  }[];
  distribution: Record<string, number>;
  total_pool_sats: number;
};

type DemoScenario = {
  key: string;
  title: string;
  category: string;
  badge: string;
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
  policyReason: string;
  productionFit: string;
  productionUnlock: string;
  safeAction: string;
  unsafeAction: string;
};

const SCENARIOS: DemoScenario[] = [
  {
    key: "shopping_checkout",
    title: "Shopping Checkout",
    category: "shopping_scam",
    badge: "Browser agent",
    goal: "Buy discounted AirPods from discount-airpods-example.com only if it is trustworthy.",
    context: {
      url: "https://discount-airpods-example.com/checkout",
      page_title: "AirPods Pro — Special Discount!",
      action_value_sats: 80000,
    },
    policy: {
      max_budget_sats: 200,
      deadline_seconds: 120,
      min_confidence: 0.85,
      risk_tolerance: "low",
    },
    policyReason: "Unknown merchant plus checkout flow triggered a mandatory trust check before payment.",
    productionFit: "Useful for shopping bots, booking agents, and any browser agent that is about to spend money or enter credentials.",
    productionUnlock: "Same flow can protect autonomous purchasing, travel bookings, ad-buying agents, and account login actions.",
    safeAction: "PURCHASE APPROVED",
    unsafeAction: "PURCHASE REFUSED",
  },
  {
    key: "source_check",
    title: "Source Verification",
    category: "source_check",
    badge: "Research agent",
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
    policyReason: "Unverified source would affect downstream reasoning, so the agent paused before citing it.",
    productionFit: "Useful for research agents, news assistants, and autonomous analysts that must avoid poisoning themselves with weak sources.",
    productionUnlock: "Same pattern can gate citation, escalation, publication, and automated briefing generation.",
    safeAction: "SOURCE ACCEPTED",
    unsafeAction: "SOURCE REJECTED",
  },
  {
    key: "code_security",
    title: "Code Execution Gate",
    category: "code_security",
    badge: "Code agent",
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
    policyReason: "Executing untrusted code is irreversible, so the agent required external trust before running it.",
    productionFit: "Useful for coding agents, CI/CD agents, package managers, and server automation that can cause real system damage.",
    productionUnlock: "This is the production story for shell execution, dependency installs, deploy approvals, and infrastructure changes.",
    safeAction: "EXECUTION APPROVED",
    unsafeAction: "EXECUTION BLOCKED",
  },
  {
    key: "legal_clause",
    title: "Contract Clause Review",
    category: "legal_clause",
    badge: "Ops agent",
    goal: "Accept the vendor terms from compliance-fastlane.example only if the risk is low.",
    context: {
      url: "https://compliance-fastlane.example/msa",
      page_title: "Master Service Agreement",
      action_value_sats: 120000,
    },
    policy: {
      max_budget_sats: 240,
      deadline_seconds: 180,
      min_confidence: 0.92,
      risk_tolerance: "low",
    },
    policyReason: "The agent detected a legal acceptance boundary and escalated to higher-confidence review.",
    productionFit: "Useful for procurement, finance, and legal workflow agents that should never accept terms without review.",
    productionUnlock: "The same trust proof can be attached to contracts, approvals, audit logs, and procurement workflows.",
    safeAction: "TERMS ACCEPTED",
    unsafeAction: "TERMS ESCALATED",
  },
];

const DEFAULT_SCENARIO_KEY = SCENARIOS[0].key;

type Phase =
  | "idle"
  | "finding"
  | "policy_triggered"
  | "quoting"
  | "paying"
  | "verifying"
  | "proof_ready"
  | "decided";

const PHASES: Phase[] = ["idle", "finding", "policy_triggered", "quoting", "paying", "verifying", "proof_ready", "decided"];
const PHASE_LABELS: Record<Phase, string> = {
  idle: "Idle",
  finding: "Finding",
  policy_triggered: "Policy",
  quoting: "Quoting",
  paying: "Paying",
  verifying: "Verifying",
  proof_ready: "Proof Ready",
  decided: "Done",
};

function getPhaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

function getStepIcon(text: string) {
  const lowered = text.toLowerCase();
  if (lowered.includes("invoice") || lowered.includes("payment") || lowered.includes("pay") || lowered.includes("sats")) {
    return <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  }
  if (lowered.includes("verify") || lowered.includes("verif") || lowered.includes("proof")) {
    return <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  }
  if (lowered.includes("policy") || lowered.includes("blocked") || lowered.includes("suspicious")) {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  }
  if (lowered.includes("goal") || lowered.includes("route") || lowered.includes("quot")) {
    return <Search className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />;
  }
  if (lowered.includes("verdict") || lowered.includes("final")) {
    return <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />;
  }
  return <Bot className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
}

export default function AgentDemoPage() {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState(DEFAULT_SCENARIO_KEY);
  const [goal, setGoal] = useState(SCENARIOS[0].goal);
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [recommendedRoute, setRecommendedRoute] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [sseEvents, setSseEvents] = useState<StreamEvent[]>([]);
  const [proof, setProof] = useState<TrustProofData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState<DemoStep>("scenario");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [predictionState, setPredictionState] = useState<PredictionState | null>(null);
  const [lightningUnavailable, setLightningUnavailable] = useState(false);

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const predictionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS.find((item) => item.key === selectedScenarioKey) ?? SCENARIOS[0];

  const addStep = useCallback((text: string) => {
    setSteps((prev) => [...prev, { text, timestamp: new Date() }]);
  }, []);

  const cleanup = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (predictionPollRef.current) {
      clearInterval(predictionPollRef.current);
      predictionPollRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startSSE = useCallback((tId: string) => {
    const es = new EventSource(`/api/trust/${tId}/events`);
    sseRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setSseEvents((prev) => [...prev, { type: e.type || "message", data, timestamp: new Date() }]);
      } catch {}
    };

    const eventTypes = [
      "verifier_started",
      "assessment_submitted",
      "human_review_requested",
      "proof_ready",
      "seller_payout",
      "disagreement_detected",
      "arena_challenge_spawned",
      "prediction_market_opened",
      "bet_received",
      "prediction_market_closed",
      "prediction_market_resolved",
    ];

    for (const type of eventTypes) {
      es.addEventListener(type, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          setSseEvents((prev) => [...prev, { type, data, timestamp: new Date() }]);
          if (type === "proof_ready") {
            setPhase("proof_ready");
            addStep("Proof signed and ready.");
          }
        } catch {}
      });
    }

    es.onerror = () => {};
    return es;
  }, [addStep]);

  const pollPredictionMarket = useCallback((tId: string) => {
    if (predictionPollRef.current) clearInterval(predictionPollRef.current);
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/prediction/${tId}/state`, { cache: "no-store" });
        if (res.ok) {
          setPredictionState(await res.json());
        }
      } catch {}
    }, 900);
    predictionPollRef.current = interval;
  }, []);

  const pollForProof = useCallback((tId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/trust/${tId}/proof`);
        if (res.ok) {
          const data = await res.json();
          setProof(data);
          setPhase("decided");
          addStep(`Final verdict: ${data.verdict?.toUpperCase()} (${Math.round((data.confidence ?? 0) * 100)}% confidence)`);
          clearInterval(interval);
          pollRef.current = null;
        }
      } catch {}
    }, 2000);
    pollRef.current = interval;
  }, [addStep]);

  function resetRunState() {
    cleanup();
    setError(null);
    setSteps([]);
    setSseEvents([]);
    setRoutes([]);
    setTaskId(null);
    setSelectedRoute(null);
    setRecommendedRoute(null);
    setInvoice(null);
    setProof(null);
    setPredictionState(null);
    setLightningUnavailable(false);
    setDemoStep("scenario");
    setPhase("idle");
  }

  async function getQuoteStep() {
    const activeScenario = SCENARIOS.find((item) => item.key === selectedScenarioKey) ?? SCENARIOS[0];

    cleanup();
    setError(null);
    setSteps([]);
    setSseEvents([]);
    setRoutes([]);
    setTaskId(null);
    setSelectedRoute(null);
    setRecommendedRoute(null);
    setInvoice(null);
    setProof(null);
    setPredictionState(null);
    setLightningUnavailable(false);
    setPhase("finding");
    setDemoStep("scenario");
    setBusyAction("quote");

    try {
      addStep(`Goal received: "${goal}"`);
      addStep(`Action boundary detected: ${activeScenario.badge.toLowerCase()} is about to act on ${activeScenario.context.url}`);

      setPhase("policy_triggered");
      addStep(activeScenario.policyReason);
      addStep(
        `Policy: ${activeScenario.policy.risk_tolerance} risk tolerance, min ${Math.round(activeScenario.policy.min_confidence * 100)}% confidence, max ${activeScenario.policy.max_budget_sats} sats.`
      );

      setPhase("quoting");
      addStep(`Requesting ${activeScenario.category} trust quote from the Trust402 market...`);
      const quoteRes = await fetch("/api/trust/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_agent: {
            id: `agent_demo_${activeScenario.key}`,
            name: `BuyerBot-${activeScenario.title.replace(/\s+/g, "")}`,
          },
          claim: goal,
          category: activeScenario.category,
          context: activeScenario.context,
          policy: activeScenario.policy,
        }),
      });

      if (!quoteRes.ok) throw new Error(`Quote failed: ${await quoteRes.text()}`);
      const quoteData = await quoteRes.json();
      const tId: string = quoteData.task_id;
      setTaskId(tId);

      const routeOptions: RouteOption[] = quoteData.routes ?? [];
      setRoutes(routeOptions);
      setRecommendedRoute(quoteData.recommended_route ?? null);

      addStep(`Market returned ${routeOptions.length} routes. Choose one route to continue.`);
      setDemoStep("quoted");
    } catch (err) {
      setError(String(err));
      setPhase("idle");
    } finally {
      setBusyAction(null);
    }
  }

  function selectRouteStep(routeId: string) {
    if (busyAction || demoStep === "paid" || demoStep === "executing" || demoStep === "complete") return;
    setSelectedRoute(routeId);
    setDemoStep("route_selected");
    addStep(`Presenter selected route "${routeId}".`);
  }

  async function payStep() {
    if (!taskId || !selectedRoute) return;
    setError(null);
    setPhase("paying");
    setBusyAction("pay");

    try {
      if (!invoice) {
        addStep(`Creating Lightning invoice for route "${selectedRoute}"...`);
        const selectRes = await fetch(`/api/trust/${taskId}/select-route`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ route_id: selectedRoute }),
        });

        if (!selectRes.ok) throw new Error(`Select route failed: ${await selectRes.text()}`);
        const selectData = await selectRes.json();
        setInvoice(selectData.invoice ?? null);
        addStep(`Invoice created: ${selectData.amount_sats} sats.`);
      } else {
        addStep("Re-checking existing Lightning invoice settlement...");
      }

      const settleRes = await fetch("/api/payments/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId }),
      });
      if (!settleRes.ok) {
        if (settleRes.status === 402 && providerName === "alby") {
          setLightningUnavailable(true);
          addStep("Alby invoice is not settled yet. Pay it externally, retry payment, or switch this run to demo settlement.");
          return;
        }
        throw new Error(`Payment settle failed: ${await settleRes.text()}`);
      }
      addStep(`Payment settled via ${providerName === "alby" ? "Alby Lightning" : "mock Lightning"}.`);
      setDemoStep("paid");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function mockSettleFallbackStep() {
    if (!taskId) return;
    setBusyAction("mock-settle");
    setError(null);
    try {
      const settleRes = await fetch("/api/payments/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, force_mock_settle: true }),
      });
      if (!settleRes.ok) throw new Error(`Mock fallback settle failed: ${await settleRes.text()}`);
      setLightningUnavailable(false);
      setDemoStep("paid");
      addStep("Lightning unavailable. Switched this run to demo settlement so the pipeline can continue.");
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyAction(null);
    }
  }

  async function executeStep() {
    if (!taskId) return;
    setError(null);
    setPhase("verifying");
    setDemoStep("executing");
    setBusyAction("execute");

    try {
      setPhase("verifying");
      addStep("Verification pipeline started. Running verifiers...");
      startSSE(taskId);
      if (selectedRoute === "route_zero") {
        addStep("Route Zero market opened. Fixture agents will stream micro-bets for roughly 10 seconds.");
        pollPredictionMarket(taskId);
      }

      const executeRes = await fetch(`/api/trust/${taskId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!executeRes.ok) throw new Error(`Execute failed: ${await executeRes.text()}`);
      const execData = await executeRes.json();

      if (execData.status === "COMPLETED") {
        const proofRes = await fetch(`/api/trust/${taskId}/proof`);
        if (proofRes.ok) {
          const data = await proofRes.json();
          setProof(data);
          setPhase("decided");
          setDemoStep("complete");
          addStep(`Final verdict: ${data.verdict?.toUpperCase()} (${Math.round((data.confidence ?? 0) * 100)}% confidence)`);
          return;
        }
      }

      addStep("Human reviewer required. Waiting for assessment...");
      pollForProof(taskId);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusyAction(null);
    }
  }

  const providerName = (process.env.NEXT_PUBLIC_LIGHTNING_PROVIDER ?? "mock").toLowerCase();
  const verdict = proof?.verdict;
  const isActionApproved = verdict === "safe";
  const currentPhaseIndex = getPhaseIndex(phase);
  const isRunning = !!busyAction || phase === "verifying";
  const canGetQuote = !busyAction && phase !== "verifying";
  const canPay = !busyAction && demoStep === "route_selected" && !!taskId && !!selectedRoute;
  const canExecute = !busyAction && demoStep === "paid" && !!taskId;
  const hasTriggeredPolicy = currentPhaseIndex >= getPhaseIndex("policy_triggered");
  const hasQuoted = currentPhaseIndex >= getPhaseIndex("quoting");
  const hasVerification = currentPhaseIndex >= getPhaseIndex("verifying");
  const hasProof = currentPhaseIndex >= getPhaseIndex("proof_ready") || phase === "decided" || !!proof;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#f8fafc_100%)]">
      <header className="border-b border-gray-100 bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Trust402</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 text-sm">Agent Demo</span>
          </div>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back</Link>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {PHASES.filter((p) => p !== "idle").map((p, i) => {
              const pIdx = getPhaseIndex(p);
              const isActive = phase === p;
              const isDone = currentPhaseIndex > pIdx;
              return (
                <div key={p} className="flex items-center gap-1 flex-shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : isDone
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-50 text-gray-400 border border-gray-200"
                    }`}
                  >
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    {isDone && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                    {PHASE_LABELS[p]}
                  </div>
                  {i < PHASES.filter((p) => p !== "idle").length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 text-white shadow-[0_24px_64px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Presenter Flow</div>
            <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-200">
              Lightning: {providerName === "alby" ? "Alby (real)" : "Mock (demo)"}
            </div>
          </div>
          <div className="text-2xl font-semibold leading-8">Advance each trust checkpoint manually.</div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Pick a scenario, request a quote, choose a route, pay, then execute. Route Zero opens a live prediction market during the execution step.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            0. Choose Scenario
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SCENARIOS.map((item) => {
              const selected = item.key === selectedScenarioKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={isRunning || demoStep !== "scenario"}
                  onClick={() => {
                    setSelectedScenarioKey(item.key);
                    setGoal(item.goal);
                  }}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    selected
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  } disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${
                      selected
                        ? "border-blue-200 bg-white text-blue-700"
                        : "border-gray-200 bg-gray-50 text-gray-500"
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 leading-6">{item.productionFit}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            1. Goal And Protected Action
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <input
              className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-colors"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isRunning || demoStep !== "scenario"}
              placeholder="Enter agent goal..."
            />
            <button
              className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              onClick={getQuoteStep}
              disabled={!canGetQuote}
            >
              <Search className="w-4 h-4" />
              {busyAction === "quote" ? "Getting Quote..." : demoStep === "scenario" ? "Step 1: Get Quote" : "Restart Quote"}
            </button>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            {[
              { label: "1 Get Quote", active: demoStep === "quoted", done: demoStep !== "scenario" },
              { label: "2 Select Route", active: demoStep === "route_selected", done: ["route_selected", "paid", "executing", "complete"].includes(demoStep) },
              { label: "3 Pay", active: demoStep === "paid", done: ["paid", "executing", "complete"].includes(demoStep) },
              { label: "4 Execute", active: demoStep === "executing", done: demoStep === "complete" },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  item.active
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : item.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {item.label}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scenario</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{scenario.title}</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Category</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{scenario.category}</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Protected Action Value</div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{scenario.context.action_value_sats.toLocaleString()} sats</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-1">Production Context</div>
            <p className="text-sm leading-6 text-blue-900">{scenario.productionUnlock}</p>
          </div>
          {error && (
            <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            2. Why The Agent Was Blocked
          </div>
          <div className={`rounded-2xl border p-4 ${hasTriggeredPolicy ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"}`}>
            <p className={`text-sm leading-6 ${hasTriggeredPolicy ? "text-amber-900" : "text-gray-500"}`}>{scenario.policyReason}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {Object.entries(scenario.policy).map(([k, v]) => (
                <div key={k} className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                  <div className="text-xs text-gray-500 font-mono">{k.replace(/_/g, " ")}</div>
                  <div className="text-sm font-semibold text-gray-900">{String(v)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">3. Trust Route Quote</div>
              <div className="text-sm text-gray-500 mt-1">The market prices different confidence and latency bundles for this action.</div>
            </div>
            {hasQuoted && recommendedRoute && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                Recommended: {recommendedRoute}
              </span>
            )}
          </div>
          {routes.length > 0 ? (
            <div className="space-y-3">
              {routes.map((r) => {
                const rId = r.route_id ?? r.routeKey ?? "";
                return (
                  <RouteCard
                    key={rId}
                    route={r}
                    selected={selectedRoute === rId}
                    onSelect={() => selectRouteStep(rId)}
                    recommended={r.is_recommended ?? rId === recommendedRoute}
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-center text-gray-400">
              Run the demo to generate trust routes.
            </div>
          )}
          {routes.length > 0 && selectedRoute && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected Route</div>
                <div className="text-sm font-semibold text-gray-900">{selectedRoute}</div>
              </div>
              <button
                type="button"
                onClick={payStep}
                disabled={!canPay}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wallet className="w-4 h-4" />
                {busyAction === "pay" ? "Paying..." : "Step 3: Create Invoice & Pay"}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            4. Payment And Execution
          </div>
          {invoice ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="w-14 h-14 bg-white rounded-xl flex-shrink-0 flex items-center justify-center border border-amber-200">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-amber-900">Lightning invoice created and settled</div>
                  <div className="mt-2 text-xs font-mono text-gray-600 bg-white rounded-lg p-2 break-all border border-amber-100">
                    {invoice.slice(0, providerName === "alby" ? 180 : 90)}...
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      {providerName === "alby" ? "Settlement checked on Alby" : "Auto-settled in demo mode"}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1 rounded-full">
                      <Wallet className="w-3 h-3" />
                      Machine-paid trust
                    </span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                After payment, Trust402 runs the selected route and collects verifier assessments before returning a signed proof.
              </div>
              {lightningUnavailable && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <div className="text-sm font-semibold text-red-800">Lightning unavailable or invoice not settled</div>
                  <div className="mt-1 text-xs leading-5 text-red-700">
                    Pay the invoice with Alby and click payment again, or switch only this run to demo settlement.
                  </div>
                  <button
                    type="button"
                    onClick={mockSettleFallbackStep}
                    disabled={!!busyAction}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    {busyAction === "mock-settle" ? "Switching..." : "Switch To Demo Settlement"}
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={executeStep}
                disabled={!canExecute}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {busyAction === "execute" ? "Executing..." : "Step 4: Execute Verification"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-center text-gray-400">
              Payment details appear here once a route is selected and the run starts.
            </div>
          )}
        </div>

        {selectedRoute === "route_zero" && (phase === "verifying" || predictionState || sseEvents.some((e) => e.type.startsWith("prediction_") || e.type === "bet_received")) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  Route Zero Prediction Market
                </div>
                <div className="mt-1 text-sm text-gray-500">Agents bet 1-5 sats on the trust outcome. The largest pool becomes the verdict signal.</div>
              </div>
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {predictionState?.status ?? "OPENING"}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-400">Pool</div>
                <div className="mt-1 text-3xl font-bold text-gray-900">{predictionState?.total_pool_sats ?? 0}<span className="ml-1 text-sm text-gray-400">sats</span></div>
                <div className="mt-3 text-sm text-gray-500">
                  {Math.ceil((predictionState?.time_remaining_ms ?? 0) / 1000)}s remaining · {predictionState?.positions.length ?? 0} bets
                </div>
              </div>
              <div className="space-y-3">
                {["safe", "suspicious", "unsafe"].map((key) => {
                  const sats = predictionState?.distribution?.[key] ?? 0;
                  const total = Math.max(1, predictionState?.total_pool_sats ?? 0);
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold uppercase text-gray-500">{key}</span>
                        <span className="font-bold text-gray-900">{sats} sats</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${key === "safe" ? "bg-emerald-500" : key === "unsafe" ? "bg-red-500" : "bg-amber-500"}`}
                          style={{ width: `${(sats / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {(predictionState?.positions ?? []).slice(-6).reverse().map((position, index) => (
                <div key={`${position.bettor_id}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-gray-700">{position.bettor_name}</span>
                  <span className="font-mono text-gray-500">{position.predicted_verdict} · {position.amount_sats}s</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            5. Verification Progress
            {isRunning && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </div>
          {phase === "verifying" && taskId && sseEvents.some((e) => e.type === "human_review_requested") && (
            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 mb-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-900">Human reviewer assigned</div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    This route escalated to a human checkpoint. Open{" "}
                    <a href="/reviewer" target="_blank" className="underline font-medium">/reviewer</a>{" "}
                    to submit a real review, or simulate below.
                  </div>
                </div>
              </div>
              <button
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg text-sm transition-colors"
                onClick={async () => {
                  if (!taskId) return;
                  await fetch("/api/reviewer/simulate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task_id: taskId }),
                  });
                  addStep("Simulated human reviewer submitted assessment.");
                }}
              >
                <Play className="w-4 h-4" />
                Simulate Reviewer
              </button>
            </div>
          )}
          {hasVerification || steps.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Live Verification Events
                </div>
                <VerificationStream events={sseEvents} />
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Agent Log
                </div>
                {steps.length === 0 ? (
                  <div className="text-gray-400 text-sm py-4 text-center">The run log will appear here.</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {steps.map((s, i) => (
                      <div key={i} className="flex gap-2.5 items-start text-sm">
                        <div className="mt-0.5">{getStepIcon(s.text)}</div>
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-800 text-sm leading-relaxed">{s.text}</span>
                        </div>
                        <span className="text-gray-300 text-xs flex-shrink-0 mt-0.5">{s.timestamp.toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-center text-gray-400">
              Verification events and the agent log appear here during the run.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            6. Trust Proof And Final Decision
          </div>
          {proof ? (
            <div className="space-y-5">
              <TrustProofCard proof={proof} />
              {phase === "decided" && verdict && (
                <div
                  className={`rounded-xl border p-8 text-center ${
                    isActionApproved
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-3 mb-3">
                    {isActionApproved ? (
                      <CheckCircle className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-500" />
                    )}
                  </div>
                  <div className={`text-3xl font-bold mb-2 ${isActionApproved ? "text-emerald-700" : "text-red-700"}`}>
                    {isActionApproved ? scenario.safeAction : scenario.unsafeAction}
                  </div>
                  {proof.confidence !== undefined && (
                    <div className={`text-sm font-semibold mb-3 ${isActionApproved ? "text-emerald-600" : "text-red-600"}`}>
                      {Math.round(proof.confidence * 100)}% confidence
                    </div>
                  )}
                  <p className={`text-sm max-w-2xl mx-auto mb-4 leading-6 ${isActionApproved ? "text-emerald-700" : "text-red-700"}`}>
                    {isActionApproved
                      ? `Trust proof verified. The agent can proceed with ${scenario.title.toLowerCase()} because external trust was purchased before the action.`
                      : `Trust proof indicates risk. The agent refuses the action and preserves a signed record explaining why ${scenario.title.toLowerCase()} was blocked.`}
                  </p>
                  <div className={`max-w-2xl mx-auto rounded-2xl border px-4 py-3 mb-4 text-left ${
                    isActionApproved
                      ? "border-emerald-200 bg-white/80 text-emerald-900"
                      : "border-red-200 bg-white/80 text-red-900"
                  }`}>
                    <div className="text-xs font-semibold uppercase tracking-wide mb-1">
                      Without Trust402
                    </div>
                    <div className="text-sm leading-6">
                      {isActionApproved
                        ? "The agent would still have acted, but without an externalized proof, payment trail, or portable justification for why the action was safe."
                        : "The agent would likely have executed the risky action blindly. The key value is that trust was purchased before the irreversible step."}
                    </div>
                  </div>
                  {!isActionApproved && (
                    <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-2 rounded-full mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      Risk surfaced before irreversible action
                    </div>
                  )}
                  <div>
                    <button
                      className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300 text-sm font-medium transition-colors shadow-sm"
                      onClick={() => {
                        resetRunState();
                      }}
                    >
                      Run Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : hasProof ? null : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-sm text-center text-gray-400">
              The signed trust proof and final action decision will appear here at the end of the flow.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
