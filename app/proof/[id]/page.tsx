"use client";

import { useEffect, useState } from "react";
import { Shield, Zap } from "lucide-react";
import { TrustProofCard, TrustProofData } from "@/components/TrustProofCard";

export default function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const [proof, setProof] = useState<TrustProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setTaskId(id);
      fetch(`/api/trust/${id}/proof`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) setError(data.error);
          else setProof(data);
        })
        .catch((err) => setError(String(err)))
        .finally(() => setLoading(false));
    });
  }, [params]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 bg-zinc-900/40 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="font-semibold text-white">Trust402</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-400">Proof</span>
            {taskId && <span className="text-zinc-600 font-mono text-xs">{taskId}</span>}
          </div>
          <a href="/" className="text-xs text-zinc-500 hover:text-zinc-400">← Back</a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {loading && (
          <div className="text-center text-zinc-500 py-16">Loading proof...</div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {proof && (
          <div className="space-y-4">
            {proof.claim && (
              <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-4">
                <div className="text-xs text-zinc-500 mb-1">Claim</div>
                <div className="text-sm text-white">{proof.claim}</div>
              </div>
            )}
            <TrustProofCard proof={proof} />

            {/* Raw JSON */}
            <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Raw Proof JSON
              </summary>
              <pre className="mt-3 text-xs font-mono text-zinc-600 overflow-auto max-h-96">
                {JSON.stringify(proof, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}
