import "dotenv/config";
import http from "http";
import { SERVICE_AGENT_DEFINITIONS } from "../lib/verifiers/registry";
import { runLocalVerifier } from "../lib/verifiers/runner";
import type { VerifierContext } from "../lib/verifiers/types";

type AssessBody = {
  verifierKey: string;
  ctx: VerifierContext;
  reputation: number;
  costSats: number;
};

function log(agentKey: string, event: string, payload: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    agent: agentKey,
    event,
    ...payload,
  }));
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

const selectedAgent = process.env.TRUST402_AGENT_KEY;
const agents = selectedAgent
  ? SERVICE_AGENT_DEFINITIONS.filter((agent) => agent.key === selectedAgent)
  : SERVICE_AGENT_DEFINITIONS;

if (selectedAgent && agents.length === 0) {
  console.error(`[service-agent] unknown TRUST402_AGENT_KEY=${selectedAgent}`);
  process.exit(1);
}

for (const agent of agents) {
  const server = http.createServer(async (req, res) => {
    const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      log(agent.key, "health_check", {
        request_id: requestId,
        openai_backed: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_VERIFIER_MODE !== "off"),
        web_search_enabled: process.env.OPENAI_VERIFIER_WEB_SEARCH === "on",
      });
      sendJson(res, 200, {
        ok: true,
        key: agent.key,
        label: agent.label,
        port: agent.port,
        categories: agent.categories,
        openai_backed: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_VERIFIER_MODE !== "off"),
        web_search_enabled: process.env.OPENAI_VERIFIER_WEB_SEARCH === "on",
        model: process.env.OPENAI_VERIFIER_MODEL ?? "gpt-5.4-mini",
      });
      return;
    }

    if (req.method === "POST" && req.url === "/assess") {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as AssessBody;
        const started = Date.now();
        const mode = process.env.OPENAI_API_KEY && process.env.OPENAI_VERIFIER_MODE !== "off" ? "openai" : "fixture";

        log(agent.key, "assessment_received", {
          request_id: requestId,
          verifier_key: body.verifierKey,
          category: body.ctx.category,
          claim: body.ctx.claim,
          url: body.ctx.url,
          mode,
          model: mode === "openai" ? process.env.OPENAI_VERIFIER_MODEL ?? "gpt-5.4-mini" : undefined,
          web_search_enabled: process.env.OPENAI_VERIFIER_WEB_SEARCH === "on",
          reputation: body.reputation,
          cost_sats: body.costSats,
        });

        if (body.verifierKey !== agent.key) {
          log(agent.key, "assessment_forwarded_key_mismatch", {
            request_id: requestId,
            requested_verifier: body.verifierKey,
          });
        }

        log(agent.key, "solving_started", {
          request_id: requestId,
          role: agent.type,
          categories: agent.categories,
        });

        const result = await runLocalVerifier(body.verifierKey, body.ctx, body.reputation, body.costSats);
        if (!result) {
          log(agent.key, "assessment_failed", {
            request_id: requestId,
            error: `Verifier ${body.verifierKey} not found`,
          });
          sendJson(res, 404, { error: `Verifier ${body.verifierKey} not found` });
          return;
        }

        log(agent.key, "assessment_completed", {
          request_id: requestId,
          verdict: result.verdict,
          confidence: result.confidence,
          latency_ms: Date.now() - started,
          evidence: result.evidence,
        });

        sendJson(res, 200, result);
      } catch (error) {
        log(agent.key, "assessment_error", {
          request_id: requestId,
          error: String(error),
        });
        sendJson(res, 500, { error: String(error) });
      }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  });

  server.listen(agent.port, "127.0.0.1", () => {
    log(agent.key, "listening", {
      url: `http://127.0.0.1:${agent.port}`,
      type: agent.type,
      categories: agent.categories,
      openai_backed: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_VERIFIER_MODE !== "off"),
      web_search_enabled: process.env.OPENAI_VERIFIER_WEB_SEARCH === "on",
      model: process.env.OPENAI_VERIFIER_MODEL ?? "gpt-5.4-mini",
    });
  });
}

console.log(`[service-agent] started ${agents.length} local verifier agent${agents.length === 1 ? "" : "s"}`);
