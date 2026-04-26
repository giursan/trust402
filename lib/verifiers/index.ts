import type { VerifierContext, VerifierResult } from "./types";
import { SERVICE_AGENT_MAP } from "./registry";
import { runLocalVerifier } from "./runner";

export type { VerifierResult, VerifierContext } from "./types";

export async function runVerifier(
  verifierKey: string,
  ctx: VerifierContext,
  reputation: number,
  costSats: number
): Promise<VerifierResult | null> {
  const agent = SERVICE_AGENT_MAP[verifierKey];
  if (!agent) return null; // human reviewers handled separately

  const useServiceMesh = process.env.TRUST402_SERVICE_MESH !== "off";
  if (useServiceMesh) {
    try {
      const res = await fetch(`http://127.0.0.1:${agent.port}/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifierKey, ctx, reputation, costSats }),
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        return json as VerifierResult;
      }
    } catch {
      // fall back to in-process execution if local agent is not reachable
    }
  }

  return runLocalVerifier(verifierKey, ctx, reputation, costSats);
}
