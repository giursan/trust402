"use client";

import { Zap, Clock, TrendingUp, CheckCircle } from "lucide-react";

export type RouteData = {
  routeKey?: string;
  route_id?: string;
  label: string;
  priceSats?: number;
  price_sats?: number;
  expectedConfidence?: number;
  expected_confidence?: number;
  expectedLatencySeconds?: number;
  expected_latency_seconds?: number;
};

type RouteCardProps = {
  route: RouteData;
  selected: boolean;
  onSelect: () => void;
  recommended: boolean;
};

export function RouteCard({ route, selected, onSelect, recommended }: RouteCardProps) {
  const routeId = route.routeKey ?? route.route_id ?? "";
  const priceSats = route.priceSats ?? route.price_sats ?? 0;
  const confidence = route.expectedConfidence ?? route.expected_confidence ?? 0;
  const latency = route.expectedLatencySeconds ?? route.expected_latency_seconds ?? 0;

  return (
    <div
      className={`rounded-xl border-2 p-4 cursor-pointer transition-all duration-150 ${
        selected
          ? "border-amber-400 bg-amber-50 shadow-sm"
          : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
      }`}
      onClick={onSelect}
    >
      {recommended && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Recommended
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className={`font-semibold text-sm ${selected ? "text-amber-900" : "text-gray-900"}`}>{route.label}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{routeId}</div>
        </div>
        {selected && <CheckCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />}
      </div>

      {/* Big price */}
      <div className="flex items-end gap-1 mb-3">
        <span className={`text-2xl font-bold leading-none ${selected ? "text-amber-700" : "text-gray-900"}`}>{priceSats}</span>
        <span className={`text-sm mb-0.5 font-medium ${selected ? "text-amber-600" : "text-gray-500"}`}>sats</span>
        <Zap className={`w-4 h-4 mb-0.5 ml-0.5 ${selected ? "text-amber-500" : "text-amber-400"}`} />
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <TrendingUp className="w-3 h-3" />
            Confidence
          </div>
          <span className="text-xs font-semibold text-emerald-600">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Latency chip */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
          <Clock className="w-3 h-3" />
          {latency}s
        </div>

        <button
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selected
              ? "bg-amber-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
        >
          {selected ? "Selected" : "Select Route"}
        </button>
      </div>
    </div>
  );
}
