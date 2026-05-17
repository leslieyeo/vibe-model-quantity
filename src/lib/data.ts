// Real data layer. Sessions are loaded via /api/sessions; CLIENTS / MODELS
// are seeded with known entries and extended at runtime when the parser
// surfaces unseen models / projects.

export type ClientId =
  | "claude-code" | "codex-cli" | "gemini-cli" | "hermes" | "openclaw";

export type ClientKind = "cli" | "ide";

export type Client = {
  id: ClientId;
  name: string;
  short: string;
  kind: ClientKind;
};

export type Vendor = "Anthropic" | "OpenAI" | "Google";

export type Model = {
  id: string;
  vendor: Vendor;
  display: string;
  prices: { in: number; cacheR: number; cacheW: number; out: number; reason: number };
};

export type Project = { id: string; name: string; path: string };

export type Tokens = {
  in: number; cacheR: number; cacheW: number; out: number; reason: number;
};

export type Session = {
  id: string;
  start: string;
  durationMin: number;
  client: ClientId;
  model: string;
  project: string;
  title: string;
  tokens: Tokens;
  cost: number;
  messages: number;
};

export const CLIENTS: Client[] = [
  { id: "claude-code", name: "Claude Code", short: "CC",  kind: "cli" },
  { id: "codex-cli",   name: "Codex CLI",   short: "CDX", kind: "cli" },
  { id: "gemini-cli",  name: "Gemini CLI",  short: "GEM", kind: "cli" },
  { id: "hermes",      name: "Hermes",      short: "HMS", kind: "cli" },
  { id: "openclaw",    name: "OpenClaw",    short: "OPC", kind: "cli" },
];

// Seed list — extended at runtime by addModel().
export const MODELS: Model[] = [
  { id: "claude-opus-4-7",     vendor: "Anthropic", display: "Opus 4.7",        prices: { in: 15.0, cacheR: 1.50, cacheW: 18.75, out: 75.0, reason: 75.0 } },
  { id: "claude-opus-4-5",     vendor: "Anthropic", display: "Opus 4.5",        prices: { in: 15.0, cacheR: 1.50, cacheW: 18.75, out: 75.0, reason: 75.0 } },
  { id: "claude-sonnet-4-7",   vendor: "Anthropic", display: "Sonnet 4.7",      prices: { in: 3.00, cacheR: 0.30, cacheW: 3.75,  out: 15.0, reason: 15.0 } },
  { id: "claude-sonnet-4-6",   vendor: "Anthropic", display: "Sonnet 4.6",      prices: { in: 3.00, cacheR: 0.30, cacheW: 3.75,  out: 15.0, reason: 15.0 } },
  { id: "claude-sonnet-4-5",   vendor: "Anthropic", display: "Sonnet 4.5",      prices: { in: 3.00, cacheR: 0.30, cacheW: 3.75,  out: 15.0, reason: 15.0 } },
  { id: "claude-haiku-4-5",    vendor: "Anthropic", display: "Haiku 4.5",       prices: { in: 1.00, cacheR: 0.10, cacheW: 1.25,  out: 5.00, reason: 5.00 } },
  { id: "gpt-5",               vendor: "OpenAI",    display: "GPT-5",           prices: { in: 5.00, cacheR: 0.50, cacheW: 5.00,  out: 20.0, reason: 20.0 } },
  { id: "gpt-5.5",             vendor: "OpenAI",    display: "GPT-5.5",         prices: { in: 5.00, cacheR: 0.50, cacheW: 5.00,  out: 20.0, reason: 20.0 } },
  { id: "gpt-5-codex",         vendor: "OpenAI",    display: "GPT-5 Codex",     prices: { in: 2.50, cacheR: 0.25, cacheW: 2.50,  out: 10.0, reason: 10.0 } },
  { id: "o3-mini",             vendor: "OpenAI",    display: "o3-mini",         prices: { in: 1.10, cacheR: 0.11, cacheW: 1.10,  out: 4.40, reason: 4.40 } },
  { id: "gemini-2.5-pro",      vendor: "Google",    display: "Gemini 2.5 Pro",  prices: { in: 2.50, cacheR: 0.25, cacheW: 2.50,  out: 10.0, reason: 10.0 } },
  { id: "gemini-2.5-flash",    vendor: "Google",    display: "Gemini 2.5 Flash", prices: { in: 0.30, cacheR: 0.03, cacheW: 0.30, out: 2.50, reason: 2.50 } },
];

export const PROJECTS: Project[] = [];

export const SESSIONS: Session[] = [];

export function setSessions(s: Session[]) {
  SESSIONS.length = 0;
  for (const x of s) SESSIONS.push(x);
}

export function addModel(m: Model) {
  if (!MODELS.find(x => x.id === m.id)) MODELS.push(m);
}

export function addProject(p: Project) {
  if (!PROJECTS.find(x => x.id === p.id)) PROJECTS.push(p);
}

// Real wall-clock "now". The UI is meant to show the user's actual current
// time and anchor ranges to today, even if no sessions exist for today.
export function getNow(): Date {
  return new Date();
}

// Local-timezone day key — critical for grouping sessions by the day the user
// experienced them. toISOString returns UTC and would shift China-time
// midnight sessions back to the previous day.
export function dayKey(d: string | Date): string {
  const x = typeof d === "string" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sumTokens(sessions: Session[]) {
  const t: Tokens = { in: 0, cacheR: 0, cacheW: 0, out: 0, reason: 0 };
  let cost = 0;
  for (const s of sessions) {
    t.in += s.tokens.in;
    t.cacheR += s.tokens.cacheR;
    t.cacheW += s.tokens.cacheW;
    t.out += s.tokens.out;
    t.reason += s.tokens.reason;
    cost += s.cost;
  }
  return { tokens: t, cost, count: sessions.length };
}

export type Range = "today" | "7d" | "mtd" | "30d" | "60d";

export const RANGES: { id: Range; label: string; days: number | null }[] = [
  { id: "today", label: "Today",   days: 1 },
  { id: "7d",    label: "7 days",  days: 7 },
  { id: "mtd",   label: "MTD",     days: null },
  { id: "30d",   label: "30 days", days: 30 },
  { id: "60d",   label: "60 days", days: 60 },
];

export function rangeWindow(rangeId: Range) {
  const NOW = getNow();
  const end = new Date(NOW);
  const start = new Date(NOW);
  start.setHours(0, 0, 0, 0);
  if (rangeId === "today") {
    // start of today already
  } else if (rangeId === "mtd") {
    start.setDate(1);
  } else {
    const r = RANGES.find(r => r.id === rangeId)!;
    start.setDate(start.getDate() - (r.days! - 1));
  }
  return { start, end };
}

export function previousWindow(rangeId: Range) {
  const { start, end } = rangeWindow(rangeId);
  const span = +end - +start;
  const prevEnd = new Date(+start - 1);
  const prevStart = new Date(+prevEnd - span);
  return { start: prevStart, end: prevEnd };
}

export function sessionsIn(start: Date, end: Date) {
  return SESSIONS.filter(s => {
    const t = +new Date(s.start);
    return t >= +start && t <= +end;
  });
}

// NOW evaluates to real new Date() on every access (Proxy delegates to getNow).
export const NOW = new Proxy({} as Date, {
  get(_t, p) {
    const d = getNow();
    const v = (d as unknown as Record<string | symbol, unknown>)[p as string | symbol];
    return typeof v === "function" ? (v as () => unknown).bind(d) : v;
  },
}) as unknown as Date;

export type DayBucket = { key: string; date: Date };

export function dayBuckets(start: Date, end: Date): DayBucket[] {
  const out: DayBucket[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur <= endDay) {
    out.push({ key: dayKey(cur), date: new Date(cur) });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function dayLabel(date: Date, span: number): string {
  if (span <= 7) return date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3);
  if (span <= 31) return String(date.getDate()).padStart(2, "0");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type DailySeries = {
  key: string;
  date: Date;
  label: string;
  totals: Record<string, number>;
};

export function buildDailySeriesByKey(
  sessions: Session[],
  days: DayBucket[],
  getKey: (s: Session) => string,
  valueFn: (s: Session) => number = (s) => s.cost,
): DailySeries[] {
  const out: DailySeries[] = days.map(d => ({
    ...d,
    label: dayLabel(d.date, days.length),
    totals: {},
  }));
  const dayIdx = new Map(days.map((d, i) => [d.key, i]));
  for (const s of sessions) {
    const k = dayKey(s.start);
    const i = dayIdx.get(k);
    if (i == null) continue;
    const g = getKey(s);
    out[i].totals[g] = (out[i].totals[g] || 0) + valueFn(s);
  }
  return out;
}

export type AggregateRow = {
  key: string;
  cost: number;
  tokens: number;
  sessions: number;
};

export function topAggregates(sessions: Session[], getKey: (s: Session) => string): AggregateRow[] {
  const map = new Map<string, AggregateRow>();
  for (const s of sessions) {
    const k = getKey(s);
    if (!map.has(k)) map.set(k, { key: k, cost: 0, tokens: 0, sessions: 0 });
    const e = map.get(k)!;
    e.cost += s.cost;
    e.tokens += s.tokens.in + s.tokens.cacheR + s.tokens.cacheW + s.tokens.out + s.tokens.reason;
    e.sessions += 1;
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

export function formatRangeLabel(start: Date, end: Date) {
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  }
  return (s + " — " + e).toUpperCase();
}
