import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Session, Tokens } from "@/lib/data";
import { costFromTokens } from "./pricing";
import type { ParseResult } from "./types";

const SESSIONS_ROOT = path.join(os.homedir(), ".codex", "sessions");
const ARCHIVED = path.join(os.homedir(), ".codex", "archived_sessions");
// Codex rollouts can hit 100MB+ on long sessions. Cap to avoid OOM.
const MAX_FILE_BYTES = 150 * 1024 * 1024;

export async function parseCodex(): Promise<ParseResult> {
  let installed = false;
  let filesScanned = 0;
  const sessions: Session[] = [];

  try {
    await fs.access(SESSIONS_ROOT);
    installed = true;
  } catch {
    return { client: "codex-cli", sessions: [], installed: false, filesScanned: 0 };
  }

  const files: string[] = [];
  await walk(SESSIONS_ROOT, files);
  try { await walk(ARCHIVED, files); } catch { /* archived may not exist */ }

  for (const file of files) {
    if (!file.endsWith(".jsonl")) continue;
    filesScanned++;
    try {
      const stat = await fs.stat(file);
      if (stat.size > MAX_FILE_BYTES) continue;
      const text = await fs.readFile(file, "utf8");
      const s = aggregateCodexFile(text, file);
      if (!s) continue;
      const totalTok = s.tokens.in + s.tokens.cacheR + s.tokens.cacheW + s.tokens.out + s.tokens.reason;
      if (totalTok === 0) continue;
      sessions.push(s);
    } catch {
      // skip
    }
  }

  return { client: "codex-cli", sessions, installed, filesScanned };
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, out);
    else if (e.isFile()) out.push(full);
  }
}

function aggregateCodexFile(text: string, filePath: string): Session | null {
  let sessionId = "";
  let cwd = "";
  let model = "";
  let firstTs = Infinity;
  let lastTs = -Infinity;
  let messages = 0;
  let firstUserPrompt: string | null = null;
  // For Codex, token_count payload.info.total_token_usage is CUMULATIVE — take the LAST one.
  const totals: Tokens = { in: 0, cacheR: 0, cacheW: 0, out: 0, reason: 0 };

  const lines = text.split("\n");
  for (const line of lines) {
    if (!line) continue;
    let evt: Record<string, unknown>;
    try { evt = JSON.parse(line); } catch { continue; }

    const ts = typeof evt.timestamp === "string" ? Date.parse(evt.timestamp) : NaN;
    if (Number.isFinite(ts)) {
      if (ts < firstTs) firstTs = ts;
      if (ts > lastTs) lastTs = ts;
    }

    const type = evt.type as string | undefined;
    const payload = (evt.payload ?? {}) as Record<string, unknown>;

    if (type === "session_meta") {
      const meta = (payload.payload ?? payload) as Record<string, unknown>;
      // session_meta wraps actual fields one level deep in some versions; fall back to root.
      const id = (meta.id ?? payload.id) as string | undefined;
      const c = (meta.cwd ?? payload.cwd) as string | undefined;
      if (id && !sessionId) sessionId = id;
      if (c && !cwd) cwd = c;
    }

    if (type === "event_msg" && (payload.type as string | undefined) === "token_count") {
      const info = payload.info as Record<string, unknown> | undefined;
      const total = (info?.total_token_usage ?? null) as Record<string, unknown> | null;
      if (total) {
        // OpenAI convention: total.input_tokens INCLUDES cached_input_tokens.
        // We store disjoint values (Anthropic convention) so costFromTokens —
        // which sums in × in_price + cacheR × cacheR_price — doesn't double-bill
        // the cached portion at full input price.
        const inputRaw = num(total.input_tokens);
        const cached = num(total.cached_input_tokens);
        totals.in     = Math.max(0, inputRaw - cached);
        totals.cacheR = cached;
        totals.cacheW = 0;
        totals.out    = num(total.output_tokens);
        totals.reason = num(total.reasoning_output_tokens);
      }
    }

    // Try to capture model name from any "model" field
    if (!model && typeof (payload.model as unknown) === "string") {
      model = payload.model as string;
    }
    if (!model && typeof (evt.model as unknown) === "string") {
      model = evt.model as string;
    }
    if (!model && payload.response && typeof (payload.response as Record<string, unknown>).model === "string") {
      model = (payload.response as Record<string, unknown>).model as string;
    }

    if (type === "response_item" || type === "event_msg") {
      const inner = (payload.type ?? "") as string;
      if (inner === "agent_message" || inner === "task_started") messages++;
    }
    if (type === "response_item") {
      const role = payload.role as string | undefined;
      if (role === "user" && firstUserPrompt === null) {
        const content = (payload.content ?? "") as unknown;
        firstUserPrompt = extractText(content)?.slice(0, 80) ?? null;
      }
    }
  }

  if (!sessionId) {
    // derive from filename if missing
    const base = path.basename(filePath).replace(/\.jsonl$/, "");
    sessionId = base.replace(/^rollout-[\d-]+T[\d-]+-/, "");
  }
  if (!Number.isFinite(firstTs)) firstTs = Date.now();
  if (!Number.isFinite(lastTs)) lastTs = firstTs;
  if (!model) model = "gpt-5-codex"; // sensible default for codex CLI

  const cost = costFromTokens(model, totals);
  const durationMin = Math.max(1, Math.round((lastTs - firstTs) / 60000));

  return {
    id: `cdx:${sessionId}`,
    start: new Date(firstTs).toISOString(),
    durationMin,
    client: "codex-cli",
    model,
    project: projectFromCwd(cwd),
    title: firstUserPrompt || "codex session",
    tokens: totals,
    cost,
    messages,
  };
}

function num(v: unknown): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function extractText(c: unknown): string | null {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    for (const part of c) {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string") return p.text;
        if (typeof p.input_text === "string") return p.input_text;
      }
    }
  }
  return null;
}

function projectFromCwd(cwd: string): string {
  if (!cwd) return "unknown";
  const parts = cwd.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return "unknown";
  return parts[parts.length - 1];
}
