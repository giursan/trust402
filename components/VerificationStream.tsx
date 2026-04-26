"use client";

import { Shield, Zap, AlertTriangle, CheckCircle, XCircle, Clock, User } from "lucide-react";

type StreamEvent = {
  type: string;
  data: unknown;
  timestamp: Date;
};

type VerificationStreamProps = {
  events: StreamEvent[];
};

type EventConfig = {
  icon: React.ReactNode;
  dotColor: string;
  label: string;
};

function getEventConfig(type: string, data?: unknown): EventConfig {
  const d = data && typeof data === "object" ? data as Record<string, unknown> : {};
  switch (type) {
    case "verifier_started":
      return {
        icon: <Shield className="w-3.5 h-3.5 text-blue-500" />,
        dotColor: "bg-blue-500",
        label: `${d.verifier ?? "verifier"} running...`,
      };
    case "assessment_submitted": {
      const verdict = d.verdict as string | undefined;
      return {
        icon: verdict === "safe"
          ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          : verdict === "unsafe"
          ? <XCircle className="w-3.5 h-3.5 text-red-500" />
          : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
        dotColor: verdict === "safe" ? "bg-emerald-500" : verdict === "unsafe" ? "bg-red-500" : "bg-yellow-500",
        label: `${d.verifier ?? "verifier"}: ${verdict ?? "?"} (${Math.round(((d.confidence as number) ?? 0) * 100)}%)`,
      };
    }
    case "human_review_requested":
      return {
        icon: <User className="w-3.5 h-3.5 text-amber-500" />,
        dotColor: "bg-amber-500 animate-pulse",
        label: `Human reviewer required (ETA: ${d.eta_seconds ?? "?"}s)`,
      };
    case "proof_ready":
      return {
        icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
        dotColor: "bg-emerald-500",
        label: `Proof ready — ${d.verdict ?? "?"} (${Math.round(((d.confidence as number) ?? 0) * 100)}%)`,
      };
    case "seller_payout":
      return {
        icon: <Zap className="w-3.5 h-3.5 text-amber-500" />,
        dotColor: "bg-amber-500",
        label: `+${d.paid_sats ?? "?"} sats → ${d.seller_id ?? "seller"}`,
      };
    case "disagreement_detected":
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
        dotColor: "bg-orange-500",
        label: "Verifier disagreement detected",
      };
    default:
      return {
        icon: <Clock className="w-3.5 h-3.5 text-gray-400" />,
        dotColor: "bg-gray-400",
        label: type,
      };
  }
}

export function VerificationStream({ events }: VerificationStreamProps) {
  if (events.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-6">
        No events yet...
      </div>
    );
  }

  return (
    <div className="relative max-h-64 overflow-y-auto">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-100" />

      <div className="space-y-3">
        {events.map((event, i) => {
          const config = getEventConfig(event.type, event.data);
          return (
            <div
              key={i}
              className="flex items-start gap-3 pl-1"
              style={{ animation: "fadeIn 0.2s ease-out" }}
            >
              {/* Dot on timeline */}
              <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                event.type === "proof_ready" ? "bg-emerald-100 border-2 border-emerald-400" :
                event.type === "human_review_requested" ? "bg-amber-100 border-2 border-amber-400" :
                event.type === "assessment_submitted" ? "bg-blue-50 border-2 border-blue-200" :
                "bg-white border-2 border-gray-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {config.icon}
                  <span className="text-xs font-semibold text-gray-700 truncate">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{event.type}</span>
                  <span className="text-xs text-gray-300">{event.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
