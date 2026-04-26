"use client";

import { CheckCircle, XCircle, AlertTriangle, Zap, Shield, User, Cpu } from "lucide-react";

export type TrustProofData = {
  verdict?: string;
  confidence?: number;
  evidence?: string[];
  signature?: string;
  consensus?: {
    state?: string;
    quorum_reached?: boolean;
    finality?: number;
    weighted_score?: number;
    agreement_factor?: number;
    disagreement_index?: number;
    uncertainty?: number;
    economic_thesis?: string;
  };
  reward_mechanism?: {
    model?: string;
    reward_rule?: string;
    pricing_rule?: string;
    reward_pool_sats?: number;
  };
  payouts?: { verifier_name: string; amount_sats: number; verifier_type?: string; status?: string }[];
  assessments?: { verifier_name: string; verifier_type?: string; verdict: string; confidence: number; evidence?: string[] }[];
  route?: { label?: string; route_id?: string; market_price_sats?: number };
  claim?: string;
  created_at?: string;
};

type TrustProofCardProps = {
  proof: TrustProofData;
};

function VerdictDisplay({ verdict, confidence }: { verdict: string; confidence: number }) {
  if (verdict === "safe") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold text-emerald-700 uppercase tracking-wide">SAFE</div>
        <div className="text-sm font-semibold text-emerald-600">{Math.round(confidence * 100)}% confidence</div>
      </div>
    );
  }
  if (verdict === "unsafe") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-red-100 border-2 border-red-300 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="text-2xl font-bold text-red-700 uppercase tracking-wide">UNSAFE</div>
        <div className="text-sm font-semibold text-red-600">{Math.round(confidence * 100)}% confidence</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-16 h-16 rounded-full bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
      </div>
      <div className="text-2xl font-bold text-yellow-700 uppercase tracking-wide">SUSPICIOUS</div>
      <div className="text-sm font-semibold text-yellow-600">{Math.round(confidence * 100)}% confidence</div>
    </div>
  );
}

export function TrustProofCard({ proof }: TrustProofCardProps) {
  const verdict = proof.verdict ?? "unknown";
  const confidence = proof.confidence ?? 0;
  const evidence = proof.evidence ?? [];
  const consensus = proof.consensus;
  const rewardMechanism = proof.reward_mechanism;
  const payouts = proof.payouts ?? [];
  const assessments = proof.assessments ?? [];

  const topBorderColor =
    verdict === "safe" ? "border-t-emerald-400" :
    verdict === "unsafe" ? "border-t-red-400" :
    "border-t-yellow-400";

  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden border-t-4 ${topBorderColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-gray-900">Trust Proof</span>
          {proof.created_at && (
            <span className="text-xs text-gray-400">{new Date(proof.created_at).toLocaleTimeString()}</span>
          )}
        </div>
        {proof.route?.label && (
          <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full font-mono">
            via {proof.route.label}
          </span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Verdict hero */}
        <div className={`rounded-xl p-6 text-center ${
          verdict === "safe" ? "bg-emerald-50 border border-emerald-200" :
          verdict === "unsafe" ? "bg-red-50 border border-red-200" :
          "bg-yellow-50 border border-yellow-200"
        }`}>
          <VerdictDisplay verdict={verdict} confidence={confidence} />

          {/* Confidence bar */}
          <div className="mt-4 max-w-xs mx-auto">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  verdict === "safe" ? "bg-emerald-500" :
                  verdict === "unsafe" ? "bg-red-500" : "bg-yellow-500"
                }`}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {consensus && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Consensus Outcome</div>
              <div className="space-y-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Decision State</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{consensus.state ?? "unknown"}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Finality</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{Math.round((consensus.finality ?? 0) * 100)}%</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Uncertainty</div>
                    <div className="mt-1 text-sm font-semibold text-gray-900">{Math.round((consensus.uncertainty ?? 0) * 100)}%</div>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <div className="text-xs text-blue-500 uppercase tracking-wide">Consensus Thesis</div>
                  <div className="mt-1 text-sm leading-6 text-blue-900">
                    {consensus.economic_thesis ?? "Consensus compresses cost; uncertainty expands cost."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Evidence */}
          {evidence.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Evidence</div>
              <ul className="space-y-2">
                {evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Assessments */}
          {assessments.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Verifier Assessments</div>
              <div className="space-y-2">
                {assessments.map((a, i) => (
                  <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border ${
                    a.verdict === "safe" ? "bg-emerald-50 border-emerald-200" :
                    a.verdict === "unsafe" ? "bg-red-50 border-red-200" :
                    "bg-yellow-50 border-yellow-200"
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      a.verifier_type === "HUMAN" ? "bg-blue-100" : "bg-gray-100"
                    }`}>
                      {a.verifier_type === "HUMAN"
                        ? <User className="w-3.5 h-3.5 text-blue-600" />
                        : <Cpu className="w-3.5 h-3.5 text-gray-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-semibold text-gray-700 truncate">{a.verifier_name}</div>
                      <div className="h-1 bg-white/60 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${
                          a.verdict === "safe" ? "bg-emerald-500" :
                          a.verdict === "unsafe" ? "bg-red-500" : "bg-yellow-500"
                        }`} style={{ width: `${a.confidence * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                        a.verdict === "safe" ? "text-emerald-700 bg-emerald-100" :
                        a.verdict === "unsafe" ? "text-red-700 bg-red-100" :
                        "text-yellow-700 bg-yellow-100"
                      }`}>{a.verdict}</span>
                      <span className="text-xs text-gray-500">{Math.round(a.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {rewardMechanism && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reward Mechanism</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Model</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{rewardMechanism.model ?? "weighted consensus"}</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Reward Pool</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{rewardMechanism.reward_pool_sats ?? 0} sats</div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide">Pricing Rule</div>
                <div className="mt-1 text-sm leading-6 text-gray-700">{rewardMechanism.pricing_rule ?? "Price reflects uncertainty."}</div>
              </div>
            </div>
          </div>
        )}

        {/* Seller payouts */}
        {payouts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Seller Payouts</div>
            <div className="flex flex-wrap gap-2">
              {payouts.map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-mono text-gray-600">{p.verifier_name}</span>
                  <span className="text-xs font-bold text-amber-700">+{p.amount_sats} sats</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature */}
        {proof.signature && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ed25519 Signature</div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-gray-500 truncate">
                  {proof.signature.slice(0, 40)}...{proof.signature.slice(-20)}
                </div>
              </div>
              <button
                className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                onClick={() => navigator.clipboard.writeText(proof.signature ?? "")}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
