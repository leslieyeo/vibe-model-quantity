// Compute the privacy-safe payload that WOULD be uploaded to a future
// leaderboard backend. Aggregated only — no session content, no project names,
// no titles, no transcripts.

import { MODELS, SESSIONS, getNow, type Session } from "@/lib/data";

export type LeaderboardPayload = {
  schema: "vmq.lb.v1";
  period: string; // YYYY-MM
  generatedAt: string; // ISO

  // Identity (user-controlled, optional)
  nickname: string | null;
  showGithub: boolean;

  // Aggregates for the period
  totalCostUsd: number;
  totalTokens: number;
  sessionCount: number;
  daysActive: number;
  cacheHitRate: number; // 0..1
  avgDailyUsd: number;

  // Mix percentages (sum ≈ 1)
  modelMix: { vendor: string; pct: number }[];
  clientMix: { client: string; pct: number }[];
  tokenMix: { kind: "in" | "cacheR" | "cacheW" | "out" | "reason"; pct: number }[];
};

export function buildPayload(opts: { nickname: string | null; showGithub: boolean }): LeaderboardPayload {
  const now = getNow();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessions = SESSIONS.filter(s => +new Date(s.start) >= +periodStart);

  let totalCost = 0;
  let tokIn = 0, tokCacheR = 0, tokCacheW = 0, tokOut = 0, tokReason = 0;
  const byVendor = new Map<string, number>();
  const byClient = new Map<string, number>();
  const activeDays = new Set<string>();

  for (const s of sessions) {
    totalCost += s.cost;
    tokIn += s.tokens.in;
    tokCacheR += s.tokens.cacheR;
    tokCacheW += s.tokens.cacheW;
    tokOut += s.tokens.out;
    tokReason += s.tokens.reason;

    const m = MODELS.find(x => x.id === s.model);
    const vendor = m?.vendor || "Unknown";
    byVendor.set(vendor, (byVendor.get(vendor) || 0) + s.cost);
    byClient.set(s.client, (byClient.get(s.client) || 0) + s.cost);

    activeDays.add(new Date(s.start).toISOString().slice(0, 10));
  }

  const totalTok = tokIn + tokCacheR + tokCacheW + tokOut + tokReason;
  const daysSoFar = Math.max(1, now.getDate());
  const cacheHit = totalTok > 0 ? tokCacheR / totalTok : 0;
  const avgDaily = totalCost / daysSoFar;

  const modelMix = totalCost > 0
    ? [...byVendor.entries()].map(([vendor, c]) => ({ vendor, pct: round(c / totalCost) })).sort((a, b) => b.pct - a.pct)
    : [];

  const clientMix = totalCost > 0
    ? [...byClient.entries()].map(([client, c]) => ({ client, pct: round(c / totalCost) })).sort((a, b) => b.pct - a.pct)
    : [];

  const tokenMix: LeaderboardPayload["tokenMix"] = totalTok > 0
    ? [
        { kind: "in",     pct: round(tokIn / totalTok) },
        { kind: "cacheR", pct: round(tokCacheR / totalTok) },
        { kind: "cacheW", pct: round(tokCacheW / totalTok) },
        { kind: "out",    pct: round(tokOut / totalTok) },
        { kind: "reason", pct: round(tokReason / totalTok) },
      ]
    : [];

  return {
    schema: "vmq.lb.v1",
    period: now.toISOString().slice(0, 7),
    generatedAt: new Date().toISOString(),
    nickname: opts.nickname?.trim() || null,
    showGithub: opts.showGithub,
    totalCostUsd: round2(totalCost),
    totalTokens: totalTok,
    sessionCount: sessions.length,
    daysActive: activeDays.size,
    cacheHitRate: round(cacheHit),
    avgDailyUsd: round2(avgDaily),
    modelMix,
    clientMix,
    tokenMix,
  };
}

function round(n: number) { return Math.round(n * 1000) / 1000; }
function round2(n: number) { return Math.round(n * 100) / 100; }

// Mock placeholder leaderboard rows — clearly fake, used while the backend is
// not live. Will be replaced by real fetch once /api/leaderboard exists.
export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  totalCostUsd: number;
  totalTokens: number;
  sessionCount: number;
  topVendor: string;
  cacheHitRate: number;
  isYou?: boolean;
};

export function mockLeaderboard(): LeaderboardEntry[] {
  return [
    { rank: 1, nickname: "vibe whale",     totalCostUsd: 12_840, totalTokens: 8_400_000_000, sessionCount: 312, topVendor: "Anthropic", cacheHitRate: 0.91 },
    { rank: 2, nickname: "token gourmand", totalCostUsd: 11_220, totalTokens: 6_900_000_000, sessionCount: 278, topVendor: "OpenAI",    cacheHitRate: 0.85 },
    { rank: 3, nickname: "claude hugger",  totalCostUsd:  9_530, totalTokens: 5_600_000_000, sessionCount: 244, topVendor: "Anthropic", cacheHitRate: 0.93 },
    { rank: 4, nickname: "opus addict",    totalCostUsd:  8_120, totalTokens: 4_900_000_000, sessionCount: 220, topVendor: "Anthropic", cacheHitRate: 0.88 },
    { rank: 5, nickname: "you?",           totalCostUsd:  7_521, totalTokens: 2_700_000_000, sessionCount: 166, topVendor: "Anthropic", cacheHitRate: 0.93, isYou: true },
    { rank: 6, nickname: "model maximalist", totalCostUsd: 6_810, totalTokens: 4_100_000_000, sessionCount: 198, topVendor: "Anthropic", cacheHitRate: 0.79 },
    { rank: 7, nickname: "codex purist",   totalCostUsd:  6_240, totalTokens: 3_800_000_000, sessionCount: 211, topVendor: "OpenAI",    cacheHitRate: 0.82 },
    { rank: 8, nickname: "gemini grinder", totalCostUsd:  5_460, totalTokens: 3_200_000_000, sessionCount: 156, topVendor: "Google",    cacheHitRate: 0.77 },
    { rank: 9, nickname: "haiku spammer",  totalCostUsd:  4_910, totalTokens: 4_800_000_000, sessionCount: 402, topVendor: "Anthropic", cacheHitRate: 0.65 },
    { rank: 10, nickname: "sonnet lover",  totalCostUsd:  4_220, totalTokens: 2_600_000_000, sessionCount: 178, topVendor: "Anthropic", cacheHitRate: 0.86 },
  ];
}

function placeMyRow(rows: LeaderboardEntry[], my: Session[], nickname: string | null) {
  let totalCost = 0;
  let totalTok = 0;
  let topVendor = "—";
  const byVendor = new Map<string, number>();
  for (const s of my) {
    totalCost += s.cost;
    totalTok += s.tokens.in + s.tokens.cacheR + s.tokens.cacheW + s.tokens.out + s.tokens.reason;
    const m = MODELS.find(x => x.id === s.model);
    const v = m?.vendor || "Unknown";
    byVendor.set(v, (byVendor.get(v) || 0) + s.cost);
  }
  if (byVendor.size > 0) {
    topVendor = [...byVendor.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const myCost = totalCost;
  // Find rank: position in sorted-by-cost-desc among existing rows.
  const merged = rows.filter(r => !r.isYou).concat({
    rank: 0,
    nickname: nickname || "you",
    totalCostUsd: myCost,
    totalTokens: totalTok,
    sessionCount: my.length,
    topVendor,
    cacheHitRate: 0,
    isYou: true,
  });
  merged.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
  merged.forEach((r, i) => r.rank = i + 1);
  return merged.slice(0, 12);
}

export function leaderboardWithYou(nickname: string | null): LeaderboardEntry[] {
  const now = getNow();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const myMonth = SESSIONS.filter(s => +new Date(s.start) >= +periodStart);
  return placeMyRow(mockLeaderboard(), myMonth, nickname);
}
