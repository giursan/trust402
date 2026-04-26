"use client";

import { useState } from "react";
import { Shield, Zap, CheckCircle, XCircle, AlertTriangle, Star, Award, User, Clock } from "lucide-react";

const REVIEWER_ID = "human_reviewer_17";
const CATEGORIES = ["shopping_scam", "source_check", "code_security", "legal_clause"];

type TaskDetail = {
  task_id: string;
  claim: string;
  category: string;
  context: { url: string; page_title?: string };
  agent_assessments: { verifier: string; verdict: string; confidence: number; evidence: string[] }[];
  reviewer_reputation: number;
};

type EarningEntry = {
  assessment_id: string;
  verdict: string;
  earned_sats: number;
  timestamp: Date;
};

export default function ReviewerPage() {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<"safe" | "suspicious" | "unsafe" | null>(null);
  const [confidence, setConfidence] = useState(80);
  const [evidenceText, setEvidenceText] = useState("");
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function claimTask() {
    setLoading(true);
    setTask(null);
    setSubmitted(false);
    setVerdict(null);
    setEvidenceText("");
    try {
      const res = await fetch("/api/reviewer/claim-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_id: REVIEWER_ID, categories: CATEGORIES }),
      });
      const data = await res.json();
      if (data.available && data.task) {
        setTask(data.task);
      } else {
        setTask(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submitAssessment() {
    if (!task || !verdict) return;
    setSubmitError(null);
    const evidence = evidenceText.split("\n").map((e) => e.trim()).filter(Boolean);
    try {
      const res = await fetch("/api/reviewer/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.task_id,
          reviewer_id: REVIEWER_ID,
          verdict,
          confidence,
          evidence: evidence.length > 0 ? evidence : [`Human review: ${verdict}`],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error); return; }

      setEarnings((prev) => [
        { assessment_id: data.assessment_id, verdict, earned_sats: data.earned_sats ?? 15, timestamp: new Date() },
        ...prev,
      ]);
      setTotalEarned((prev) => prev + (data.earned_sats ?? 15));
      setSubmitted(true);
      setTask(null);
    } catch (err) {
      setSubmitError(String(err));
    }
  }

  const reputation = 0.96;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Trust402</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500 text-sm">Human Reviewer</span>
          </div>
          <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 space-y-4">
            {/* Profile card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3 border-2 border-blue-200">
                  <span className="text-blue-700 font-bold text-lg">HR</span>
                </div>
                <div className="text-sm font-bold text-gray-900">{REVIEWER_ID}</div>
                {reputation > 0.9 && (
                  <div className="mt-1.5 flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Award className="w-3 h-3" />
                    Expert Reviewer
                  </div>
                )}
              </div>

              {/* Reputation */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Reputation
                  </span>
                  <span className="text-sm font-bold text-gray-900">{reputation}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${reputation * 100}%` }}
                  />
                </div>
              </div>

              {/* Total earned */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Total Earned</span>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Zap className="w-3.5 h-3.5" />
                  {totalEarned} sats
                </div>
              </div>

              {/* Tasks completed */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Tasks Done</span>
                <span className="text-sm font-bold text-gray-900">{earnings.length}</span>
              </div>

              {/* Avg response */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Avg Response</span>
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  74s
                </span>
              </div>

              {/* Online status */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Status</span>
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Online
                </div>
              </div>

              {/* Categories */}
              <div className="pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">Specialties</div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <span key={c} className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                      {c.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* No task state */}
            {!task && !loading && !submitted && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <Shield className="w-7 h-7 text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Ready to earn sats?</h2>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  Claim the next available trust verification task and earn Lightning sats for your expert assessment.
                </p>
                <button
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors shadow-sm text-sm"
                  onClick={claimTask}
                  disabled={loading}
                >
                  <Shield className="w-4 h-4" />
                  Claim Next Task
                </button>
                <div className="mt-3 text-xs text-gray-400">
                  Run the Agent Demo first to generate tasks
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <div className="text-gray-500 text-sm">Checking for available tasks...</div>
              </div>
            )}

            {/* Success state */}
            {submitted && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="p-8 text-center border-b border-gray-100">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-emerald-700 mb-1">Assessment submitted!</h2>
                  {earnings[0] && (
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold px-4 py-2 rounded-full mt-2">
                      <Zap className="w-4 h-4" />
                      +{earnings[0].earned_sats} sats earned
                    </div>
                  )}
                </div>
                <div className="p-5 text-center">
                  <button
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors text-sm"
                    onClick={claimTask}
                  >
                    <Shield className="w-4 h-4" />
                    Claim Next Task
                  </button>
                </div>
              </div>
            )}

            {/* Task claimed */}
            {task && (
              <div className="space-y-5">
                {/* Task header */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full">
                        {task.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{task.task_id.slice(0, 16)}...</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                      <Zap className="w-3 h-3" />
                      Earn ~32 sats
                    </div>
                  </div>
                  <div className="text-gray-900 font-medium text-sm mb-3">{task.claim}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">URL:</span>
                    <span className="text-xs font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">{task.context.url}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Agent findings */}
                  {task.agent_assessments.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Agent Findings</div>
                      <div className="space-y-3">
                        {task.agent_assessments.map((a, i) => (
                          <div key={i} className={`rounded-lg border p-3 ${
                            a.verdict === "safe" ? "border-emerald-200 bg-emerald-50" :
                            a.verdict === "unsafe" ? "border-red-200 bg-red-50" :
                            "border-yellow-200 bg-yellow-50"
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3 h-3 text-gray-500" />
                                <span className="text-xs font-mono font-semibold text-gray-700">{a.verifier}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{Math.round(a.confidence * 100)}%</span>
                                <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                                  a.verdict === "safe" ? "text-emerald-700 bg-emerald-100" :
                                  a.verdict === "unsafe" ? "text-red-700 bg-red-100" :
                                  "text-yellow-700 bg-yellow-100"
                                }`}>{a.verdict}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/80 rounded-full overflow-hidden mb-2">
                              <div className={`h-full rounded-full ${
                                a.verdict === "safe" ? "bg-emerald-500" :
                                a.verdict === "unsafe" ? "bg-red-500" : "bg-yellow-500"
                              }`} style={{ width: `${a.confidence * 100}%` }} />
                            </div>
                            {a.evidence.slice(0, 2).map((e, j) => (
                              <div key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <XCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                {e}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assessment form */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Assessment</div>

                    {/* Verdict buttons */}
                    <div className="space-y-2">
                      {([
                        { v: "safe" as const, icon: CheckCircle, label: "Safe", desc: "Legitimate, trustworthy", color: "emerald" },
                        { v: "suspicious" as const, icon: AlertTriangle, label: "Suspicious", desc: "Needs caution, uncertain", color: "yellow" },
                        { v: "unsafe" as const, icon: XCircle, label: "Unsafe", desc: "Fraudulent or harmful", color: "red" },
                      ]).map(({ v, icon: Icon, label, desc, color }) => (
                        <button
                          key={v}
                          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                            verdict === v
                              ? color === "emerald"
                                ? "border-emerald-400 bg-emerald-50"
                                : color === "yellow"
                                ? "border-yellow-400 bg-yellow-50"
                                : "border-red-400 bg-red-50"
                              : "border-gray-100 bg-gray-50 hover:border-gray-200"
                          }`}
                          onClick={() => setVerdict(v)}
                        >
                          <Icon className={`w-5 h-5 ${
                            verdict === v
                              ? color === "emerald" ? "text-emerald-500"
                              : color === "yellow" ? "text-yellow-500"
                              : "text-red-500"
                              : "text-gray-400"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${
                              verdict === v
                                ? color === "emerald" ? "text-emerald-800"
                                : color === "yellow" ? "text-yellow-800"
                                : "text-red-800"
                                : "text-gray-700"
                            }`}>{label}</div>
                            <div className="text-xs text-gray-500">{desc}</div>
                          </div>
                          {verdict === v && (
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              color === "emerald" ? "bg-emerald-500" : color === "yellow" ? "bg-yellow-500" : "bg-red-500"
                            }`}>
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Confidence slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-500 font-medium">Confidence</span>
                        <span className={`font-bold text-sm ${
                          confidence >= 80 ? "text-emerald-600" : confidence >= 65 ? "text-yellow-600" : "text-red-600"
                        }`}>{confidence}%</span>
                      </div>
                      <div className="relative">
                        <div className="h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-emerald-200 rounded-full mb-1" />
                        <input
                          type="range"
                          min={50}
                          max={99}
                          value={confidence}
                          onChange={(e) => setConfidence(Number(e.target.value))}
                          className="w-full accent-blue-500 -mt-1"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Low (50%)</span>
                        <span>High (99%)</span>
                      </div>
                    </div>

                    {/* Evidence */}
                    <div>
                      <div className="text-xs text-gray-500 font-medium mb-1.5">Evidence <span className="text-gray-400 font-normal">(one per line)</span></div>
                      <textarea
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none transition-colors"
                        rows={3}
                        value={evidenceText}
                        onChange={(e) => setEvidenceText(e.target.value)}
                        placeholder={"Domain registered last month\nNo SSL certificate\nPrice too low"}
                      />
                    </div>

                    {submitError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {submitError}
                      </div>
                    )}

                    <button
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm flex items-center justify-center gap-2"
                      onClick={submitAssessment}
                      disabled={!verdict}
                    >
                      <Shield className="w-4 h-4" />
                      Submit Assessment
                      <span className="text-blue-200 font-normal">· Earn ~32 sats</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings history */}
            {earnings.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Earnings History</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Time</th>
                      <th className="text-left pb-2 font-medium">Category</th>
                      <th className="text-left pb-2 font-medium">Verdict</th>
                      <th className="text-right pb-2 font-medium">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {earnings.map((e) => (
                      <tr key={e.assessment_id} className={`${
                        e.verdict === "safe" ? "bg-emerald-50/30" :
                        e.verdict === "unsafe" ? "bg-red-50/30" : "bg-yellow-50/30"
                      }`}>
                        <td className="py-2.5 text-gray-500 text-xs">{e.timestamp.toLocaleTimeString()}</td>
                        <td className="py-2.5 text-gray-600 text-xs">—</td>
                        <td className="py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            e.verdict === "safe" ? "text-emerald-700 bg-emerald-100" :
                            e.verdict === "unsafe" ? "text-red-700 bg-red-100" :
                            "text-yellow-700 bg-yellow-100"
                          }`}>{e.verdict}</span>
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1 text-amber-500 font-bold text-xs">
                            <Zap className="w-3 h-3" />
                            +{e.earned_sats} sats
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
