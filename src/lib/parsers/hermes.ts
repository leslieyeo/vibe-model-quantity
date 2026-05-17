import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Session, Tokens } from "@/lib/data";
import { costFromTokens } from "./pricing";
import type { ParseResult } from "./types";

// Hermes records token usage via the vibeusage plugin into this JSONL ledger.
// Each line: {version, type:"usage"|"session_start"|"session_end", source,
//   session_id, platform, model, provider, emitted_at,
//   input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
//   reasoning_tokens, total_tokens, api_mode, api_call_count, finish_reason}
const LEDGER = path.join(os.homedir(), ".vibeusage", "tracker", "hermes.usage.jsonl");
const HERMES_DIR = path.join(os.homedir(), ".hermes");

type SessionDay = {
  firstTs: number;
  lastTs: number;
  model: string; // most-used model
  modelCounts: Map<string, number>;
  platform: string;
  tokens: Tokens;
  apiCalls: number;
};

export async function parseHermes(): Promise<ParseResult> {
  // Hermes installed = ~/.hermes exists
  let installed = false;
  try { await fs.access(HERMES_DIR); installed = true; } catch {}

  if (!installed) {
    return { client: "hermes", sessions: [], installed: false, filesScanned: 0 };
  }

  // Read the vibeusage ledger
  let ledgerExists = false;
  try { await fs.access(LEDGER); ledgerExists = true; } catch {}
  if (!ledgerExists) {
    return {
      client: "hermes", sessions: [], installed, filesScanned: 0,
      notes: ["Hermes detected but no vibeusage ledger at ~/.vibeusage/tracker/hermes.usage.jsonl. Install the vibeusage plugin to collect token data."],
    };
  }

  const text = await fs.readFile(LEDGER, "utf8");
  const lines = text.split("\n");

  // Group by (session_id, local-day)
  const groups = new Map<string, SessionDay>();
  let usageLines = 0;

  for (const line of lines) {
    if (!line) continue;
    let evt: Record<string, unknown>;
    try { evt = JSON.parse(line); } catch { continue; }
    if (evt.type !== "usage") continue;
    usageLines++;

    const sessionId = String(evt.session_id || "");
    const emitted = String(evt.emitted_at || "");
    const ts = Date.parse(emitted);
    if (!Number.isFinite(ts)) continue;

    const dayKey = localDayKey(ts);
    const key = `${sessionId}:${dayKey}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        firstTs: Infinity,
        lastTs: -Infinity,
        model: "",
        modelCounts: new Map(),
        platform: String(evt.platform || ""),
        tokens: { in: 0, cacheR: 0, cacheW: 0, out: 0, reason: 0 },
        apiCalls: 0,
      };
      groups.set(key, g);
    }
    if (ts < g.firstTs) g.firstTs = ts;
    if (ts > g.lastTs) g.lastTs = ts;
    const model = String(evt.model || "");
    if (model) g.modelCounts.set(model, (g.modelCounts.get(model) || 0) + 1);
    g.tokens.in     += num(evt.input_tokens);
    g.tokens.out    += num(evt.output_tokens);
    g.tokens.cacheR += num(evt.cache_read_tokens);
    g.tokens.cacheW += num(evt.cache_write_tokens);
    g.tokens.reason += num(evt.reasoning_tokens);
    g.apiCalls += num(evt.api_call_count) || 1;
  }

  const sessions: Session[] = [];
  for (const [key, g] of groups) {
    const total = g.tokens.in + g.tokens.cacheR + g.tokens.cacheW + g.tokens.out + g.tokens.reason;
    if (total === 0) continue;
    // pick most-used model
    let bestModel = "hermes-unknown"; let bestCount = 0;
    for (const [m, c] of g.modelCounts) if (c > bestCount) { bestModel = m; bestCount = c; }

    const cost = costFromTokens(bestModel, g.tokens);
    const durationMin = Math.max(1, Math.round((g.lastTs - g.firstTs) / 60000));
    const platform = g.platform || "unknown";

    sessions.push({
      id: `hms:${key}`,
      start: new Date(g.firstTs).toISOString(),
      durationMin,
      client: "hermes",
      model: bestModel,
      project: `hermes-${platform}`,
      title: `hermes · ${platform}`,
      tokens: g.tokens,
      cost,
      messages: g.apiCalls,
    });
  }

  return {
    client: "hermes",
    sessions,
    installed,
    filesScanned: 1,
    notes: usageLines === 0 ? ["vibeusage ledger present but contains no usage records yet."] : [],
  };
}

function num(v: unknown): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function localDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
