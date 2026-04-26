import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronRight,
  Cpu,
  Lock,
  Scale,
  Search,
  Shield,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

const navCards = [
  {
    href: "/agent-demo",
    icon: Zap,
    title: "Agent Demo",
    description: "Run the trust checkpoint yourself. Watch an agent quote, pay, verify, and decide before taking action.",
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    border: "border-amber-200 hover:border-amber-300",
    tag: "Interactive",
    tagColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    href: "/reviewer",
    icon: Shield,
    title: "Reviewer Desk",
    description: "See the human side of the market: specialists claim tasks, add evidence, and earn sats for judgment.",
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    border: "border-blue-200 hover:border-blue-300",
    tag: "Human Loop",
    tagColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    href: "/market",
    icon: BarChart3,
    title: "Market State",
    description: "Show demand, liquidity, pricing pressure, and who is getting paid when trust is purchased.",
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    border: "border-emerald-200 hover:border-emerald-300",
    tag: "Live View",
    tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    href: "/arena",
    icon: Trophy,
    title: "The Arena",
    description: "Challenge new verifier agents with honeypots and real task replays before they can become paid sellers.",
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    border: "border-red-200 hover:border-red-300",
    tag: "Adversarial",
    tagColor: "bg-red-50 text-red-700 border-red-200",
  },
];

const useCases = [
  {
    icon: Search,
    title: "Primary Wedge: Browser Commerce Agents",
    description: "Before paying an unknown merchant, entering credentials, or following a suspicious checkout flow, the agent buys trust instead of guessing.",
    category: "checkout scams, phishing, spoofed storefronts",
  },
  {
    icon: Cpu,
    title: "Code And DevOps Agents",
    description: "Before running a package, shell command, or deployment, the agent can buy security and reputation checks.",
    category: "dependency risk, infra actions, code execution",
  },
  {
    icon: Scale,
    title: "Legal And Business Agents",
    description: "Before signing a clause, accepting terms, or approving a payment, the agent buys higher-confidence review.",
    category: "contracts, policies, compliance gates",
  },
];

const steps = [
  {
    num: "01",
    title: "Agent hits a trust boundary",
    desc: "The agent is about to do something irreversible, costly, or risky. Policy blocks blind execution.",
    color: "bg-amber-500",
  },
  {
    num: "02",
    title: "Trust402 prices the route",
    desc: "The market offers fast, balanced, and high-confidence routes based on demand, liquidity, and urgency.",
    color: "bg-blue-500",
  },
  {
    num: "03",
    title: "Verifiers get paid to assess",
    desc: "Tool agents and humans independently submit verdicts and evidence. Better verifiers earn more over time.",
    color: "bg-emerald-500",
  },
  {
    num: "04",
    title: "Agent receives signed proof",
    desc: "The result is a portable proof the agent can attach to logs, workflows, payments, or downstream approvals.",
    color: "bg-rose-500",
  },
];

const checkpoints = [
  "Unknown website before payment",
  "New dependency before execution",
  "Contract before acceptance",
  "Wallet address before transfer",
];

const whyLightning = [
  "Agents can spend tiny amounts for trust exactly when needed.",
  "Verifiers can be paid instantly for one-off judgments.",
  "Trust becomes an on-demand machine-to-machine market, not a manual service contract.",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_32%),linear-gradient(180deg,#fff_0%,#f8fafc_100%)]">
      <header className="sticky top-0 z-10 border-b border-white/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Trust402</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/agent-demo" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Demo
            </Link>
            <Link href="/reviewer" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Reviewer
            </Link>
            <Link href="/market" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Market
            </Link>
            <Link href="/arena" className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
              Arena
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-6 pb-16 pt-18">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                  HTTP 402 For Risky Agent Actions
                </span>
              </div>
              <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] tracking-tight text-gray-950 md:text-6xl">
                Before an agent pays,
                <br />
                it should be able to
                <br />
                <span className="text-amber-600">buy trust in real time.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                Trust402 turns risky actions into trust-gated actions. A browser agent hits an unsafe checkout, pays a few sats for verification over Lightning, gets a signed proof, and changes behavior before money is lost.
              </p>
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 max-w-xl">
                <div className="text-xs font-semibold uppercase tracking-wide text-red-600">Killer Demo Moment</div>
                <div className="mt-1 text-sm leading-6 text-red-900">
                  Without Trust402, the agent would have executed the payment. With Trust402, it buys trust first and blocks the scam.
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/agent-demo"
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-400"
                >
                  Open Product Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/market"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  View Trust Market
                  <BarChart3 className="h-4 w-4" />
                </Link>
                <Link
                  href="/arena"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
                >
                  Enter Arena
                  <Trophy className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-2">
                {["Lightning micropayments", "HTTP 402 gating", "Signed Ed25519 proofs", "AI + human verifiers", "Reputation-priced routing"].map((tag) => (
                  <span key={tag} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Judge Lens</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">Why this feels inevitable</div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Agent blocked
                </span>
              </div>
              <div className="space-y-3">
                {checkpoints.map((checkpoint, i) => (
                  <div key={checkpoint} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{checkpoint}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Core Insight</div>
                <div className="mt-1 text-sm leading-6 text-blue-900">
                  Autonomous systems already know how to act. They still do not know how to buy external trust before acting.
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Bot className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Buyer</span>
                  </div>
                  <div className="mt-2 text-sm text-amber-900">Pays sats for trust when policy requires it.</div>
                </div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Verifiers</span>
                  </div>
                  <div className="mt-2 text-sm text-blue-900">Submit evidence-backed judgments with reputation.</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Wallet className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">Proof</span>
                  </div>
                  <div className="mt-2 text-sm text-emerald-900">Returns a signed artifact the agent can rely on.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 flex items-end justify-between gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Best Wedge First</div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Start with agents that spend money on the open web</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-gray-500">
                The broad vision matters, but the sharpest entry point is browser and commerce agents. The failure is obvious, the loss is real, and Lightning micropayments make the verification market practical.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {useCases.map(({ icon: Icon, title, description, category }) => (
                <div key={title} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                    <Icon className="h-5 w-5 text-gray-700" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
                  <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">
                    Production fit: {category}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-gray-100 bg-white px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Why Lightning</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Lightning is not decoration here</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {whyLightning.map((point, i) => (
                <div key={point} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500">
                    <span className="text-sm font-bold text-white">0{i + 1}</span>
                  </div>
                  <p className="text-sm leading-6 text-gray-700">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-gray-100 bg-white px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">System Flow</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">From blocked action to portable trust proof</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((step, i) => (
                <div key={step.title} className="relative rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${step.color}`}>
                    <span className="text-sm font-bold text-white">{step.num}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="absolute -right-3 top-8 hidden md:block">
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Product Views</div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">See the network from every angle</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {navCards.map(({ href, icon: Icon, title, description, iconColor, iconBg, border, tag, tagColor }) => (
                <Link
                  key={href}
                  href={href}
                  className={`group rounded-3xl border ${border} bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg}`}>
                      <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tagColor}`}>{tag}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-700">
                    Open view
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-sm text-gray-400">Lightning-native trust infrastructure for autonomous actions</span>
          </div>
          <span className="text-xs font-mono text-gray-300">trust402.dev</span>
        </div>
      </footer>
    </div>
  );
}
