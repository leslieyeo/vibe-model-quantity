export function fmtUSD(n: number | null | undefined, { decimals = 2 }: { decimals?: number } = {}): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 10000) return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}

export const fmtTokens = fmtCompact;

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || !isFinite(n)) return "—";
  return (n * 100).toFixed(decimals) + "%";
}
