import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Session, Tokens } from "@/lib/data";
import { costFromTokens } from "./pricing";
import type { ParseResult } from "./types";

const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");
// Skip absurdly large session files — reading 500MB into a single string
// would OOM the API route. Real Claude Code sessions top out around 30MB.
const MAX_FILE_BYTES = 100 * 1024 * 1024;

type DayAgg = {
  firstTs: number;
  lastTs: number;
  model: string;
  tokens: Tokens;
  messages: number;
  title: string | null;
};

type AggFile = {
  sessionId: string;
  cwd: string;
  days: Map<string, DayAgg>; // local-day key (YYYY-MM-DD) → per-day aggregate
};

export async function parseClaudeCode(): Promise<ParseResult> {
  let installed = false;
  let filesScanned = 0;
  const sessions: Session[] = [];

  try {
    await fs.access(PROJECTS_DIR);
    installed = true;
  } catch {
    return { client: "claude-code", sessions: [], installed: false, filesScanned: 0 };
  }

  const projectDirs = await fs.readdir(PROJECTS_DIR);
  for (const dirName of projectDirs) {
    const dir = path.join(PROJECTS_DIR, dirName);
    let entries: string[];
    try {
      const stat = await fs.stat(dir);
      if (!stat.isDirectory()) continue;
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".jsonl")) continue;
      filesScanned++;
      const file = path.join(dir, entry);
      try {
        const stat = await fs.stat(file);
        if (stat.size > MAX_FILE_BYTES) continue;
        const text = await fs.readFile(file, "utf8");
        const agg = aggregateSessionFile(text);
        if (!agg) continue;

        const project = projectIdFromCwd(agg.cwd || decodeCwd(dirName));
        for (const [dayKey, day] of agg.days) {
          const total = day.tokens.in + day.tokens.cacheR + day.tokens.cacheW + day.tokens.out + day.tokens.reason;
          if (total === 0) continue;
          const cost = costFromTokens(day.model, day.tokens);
          const durationMin = Math.max(1, Math.round((day.lastTs - day.firstTs) / 60000));
          sessions.push({
            id: `cc:${agg.sessionId}:${dayKey}`,
            start: new Date(day.firstTs).toISOString(),
            durationMin,
            client: "claude-code",
            model: day.model,
            project,
            title: day.title || "claude code session",
            tokens: day.tokens,
            cost,
            messages: day.messages,
          });
        }
      } catch {
        // skip broken file
      }
    }
  }

  return { client: "claude-code", sessions, installed, filesScanned };
}

// One file → potentially multiple Sessions, one per LOCAL calendar day.
// Long-running conversations spanning multiple days get attributed correctly.
function aggregateSessionFile(text: string): AggFile | null {
  let sessionId = "";
  let cwd = "";
  const days = new Map<string, DayAgg>();

  function dayKeyOf(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function ensureDay(key: string): DayAgg {
    let a = days.get(key);
    if (!a) {
      a = {
        firstTs: Infinity,
        lastTs: -Infinity,
        model: "",
        tokens: { in: 0, cacheR: 0, cacheW: 0, out: 0, reason: 0 },
        messages: 0,
        title: null,
      };
      days.set(key, a);
    }
    return a;
  }

  const lines = text.split("\n");
  for (const line of lines) {
    if (!line) continue;
    let evt: Record<string, unknown>;
    try { evt = JSON.parse(line); } catch { continue; }

    if (typeof evt.sessionId === "string" && !sessionId) sessionId = evt.sessionId;
    if (typeof evt.cwd === "string" && !cwd) cwd = evt.cwd;

    const ts = typeof evt.timestamp === "string" ? Date.parse(evt.timestamp) : NaN;
    if (!Number.isFinite(ts)) continue;

    const dKey = dayKeyOf(ts);
    const agg = ensureDay(dKey);
    if (ts < agg.firstTs) agg.firstTs = ts;
    if (ts > agg.lastTs) agg.lastTs = ts;

    const msg = (evt.message as Record<string, unknown> | undefined) ?? undefined;
    if (!msg) continue;

    if (msg.role === "user" && agg.title === null) {
      const c = msg.content;
      if (typeof c === "string") agg.title = c.slice(0, 80);
      else if (Array.isArray(c)) {
        const txt = c.find((x: unknown) =>
          typeof (x as { type?: unknown }).type === "string" &&
          (x as { type: string }).type === "text"
        ) as { text?: string } | undefined;
        if (txt?.text) agg.title = txt.text.slice(0, 80);
      }
      agg.messages++;
    } else if (msg.role === "assistant") {
      agg.messages++;
      if (typeof msg.model === "string") agg.model = msg.model;
      const u = msg.usage as Record<string, unknown> | undefined;
      if (u) {
        agg.tokens.in     += num(u.input_tokens);
        agg.tokens.cacheR += num(u.cache_read_input_tokens);
        agg.tokens.cacheW += num(u.cache_creation_input_tokens);
        agg.tokens.out    += num(u.output_tokens);
      }
    } else if (msg.role === "user") {
      agg.messages++;
    }
  }

  if (!sessionId || days.size === 0) return null;

  // Fill in model if a day had no assistant turn (rare)
  let fallbackModel = "claude-unknown";
  for (const d of days.values()) {
    if (d.model) { fallbackModel = d.model; break; }
  }
  for (const d of days.values()) {
    if (!d.model) d.model = fallbackModel;
  }

  return { sessionId, cwd, days };
}

function num(v: unknown): number {
  return typeof v === "number" && isFinite(v) ? v : 0;
}

function decodeCwd(dirName: string): string {
  // Claude Code encodes cwd by replacing `/` with `-`. Reverse the swap as
  // a best-effort fallback when the JSONL itself doesn't carry an explicit cwd.
  return dirName.replace(/^-/, "/").replace(/-/g, "/");
}

function projectIdFromCwd(cwd: string): string {
  if (!cwd) return "unknown";
  // last segment of path or last two
  const parts = cwd.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.length === 0) return "unknown";
  return parts[parts.length - 1];
}
