import { MODELS, type Model, type Vendor } from "@/lib/data";

type Pricing = Model["prices"];

// Fallback by family — matches a substring in the model id.
const FAMILY_FALLBACK: { match: RegExp; vendor: Vendor; prices: Pricing }[] = [
  { match: /claude.*opus/i,   vendor: "Anthropic", prices: { in: 15.0, cacheR: 1.50, cacheW: 18.75, out: 75.0, reason: 75.0 } },
  { match: /claude.*sonnet/i, vendor: "Anthropic", prices: { in: 3.00, cacheR: 0.30, cacheW: 3.75,  out: 15.0, reason: 15.0 } },
  { match: /claude.*haiku/i,  vendor: "Anthropic", prices: { in: 1.00, cacheR: 0.10, cacheW: 1.25,  out: 5.00, reason: 5.00 } },
  { match: /gpt-?5.*codex/i,  vendor: "OpenAI",    prices: { in: 2.50, cacheR: 0.25, cacheW: 2.50,  out: 10.0, reason: 10.0 } },
  { match: /gpt-?5/i,         vendor: "OpenAI",    prices: { in: 5.00, cacheR: 0.50, cacheW: 5.00,  out: 20.0, reason: 20.0 } },
  { match: /o3-?mini/i,       vendor: "OpenAI",    prices: { in: 1.10, cacheR: 0.11, cacheW: 1.10,  out: 4.40, reason: 4.40 } },
  { match: /o3/i,             vendor: "OpenAI",    prices: { in: 5.00, cacheR: 0.50, cacheW: 5.00,  out: 20.0, reason: 20.0 } },
  { match: /gemini.*flash/i,  vendor: "Google",    prices: { in: 0.30, cacheR: 0.03, cacheW: 0.30,  out: 2.50, reason: 2.50 } },
  { match: /gemini/i,         vendor: "Google",    prices: { in: 2.50, cacheR: 0.25, cacheW: 2.50,  out: 10.0, reason: 10.0 } },
  { match: /qwen/i,           vendor: "OpenAI",    prices: { in: 0.50, cacheR: 0.05, cacheW: 0.50,  out: 2.00, reason: 2.00 } },
  { match: /kimi/i,           vendor: "OpenAI",    prices: { in: 0.60, cacheR: 0.06, cacheW: 0.60,  out: 2.50, reason: 2.50 } },
  { match: /mimo/i,           vendor: "OpenAI",    prices: { in: 0.40, cacheR: 0.04, cacheW: 0.40,  out: 1.20, reason: 1.20 } },
];

const UNKNOWN_PRICES: Pricing = { in: 3.00, cacheR: 0.30, cacheW: 3.00, out: 15.0, reason: 15.0 };

export function resolveModel(modelId: string): { display: string; vendor: Vendor; prices: Pricing } {
  // Exact-match in MODELS table
  const exact = MODELS.find(m => m.id === modelId);
  if (exact) return { display: exact.display, vendor: exact.vendor, prices: exact.prices };

  // Family fallback
  for (const f of FAMILY_FALLBACK) {
    if (f.match.test(modelId)) {
      return { display: prettyName(modelId), vendor: f.vendor, prices: f.prices };
    }
  }

  return { display: modelId, vendor: "Anthropic", prices: UNKNOWN_PRICES };
}

function prettyName(id: string): string {
  return id.replace(/^claude-/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function costFromTokens(
  modelId: string,
  t: { in: number; cacheR: number; cacheW: number; out: number; reason: number },
): number {
  const p = resolveModel(modelId).prices;
  return (t.in * p.in + t.cacheR * p.cacheR + t.cacheW * p.cacheW + t.out * p.out + t.reason * p.reason) / 1_000_000;
}
