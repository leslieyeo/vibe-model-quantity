"use client";

import { fmtUSD } from "@/lib/format";
import type { DailySeries, Session, Vendor } from "@/lib/data";

// ===== Sparkline =====
export function Sparkline({
  values, width = 80, height = 28, stroke,
}: { values: number[]; width?: number; height?: number; stroke?: string }) {
  const w = width, h = height;
  if (!values || values.length === 0) return <svg className="spark" />;
  const max = Math.max(...values, 0.0001);
  const min = Math.min(...values);
  const xs = values.map((_, i) => (i / Math.max(1, values.length - 1)) * w);
  const ys = values.map(v => h - ((v - min) / Math.max(0.0001, max - min)) * (h - 4) - 2);
  const d = xs.map((x, i) => (i === 0 ? "M" : "L") + x.toFixed(1) + "," + ys[i].toFixed(1)).join(" ");
  const lastX = xs[xs.length - 1], lastY = ys[ys.length - 1];
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={stroke || "currentColor"} strokeWidth="1.2" />
      <circle cx={lastX} cy={lastY} r="1.6" fill={stroke || "currentColor"} />
    </svg>
  );
}

export type Series = { id: string; name: string; color: string };

function niceCeil(v: number) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const norm = v / base;
  let nice;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

// ===== StackedBarChart =====
export function StackedBarChart({
  days, series, height = 240, formatY = (v: number) => fmtUSD(v, { decimals: 0 }),
}: {
  days: DailySeries[];
  series: Series[];
  height?: number;
  formatY?: (v: number) => string;
}) {
  const padL = 56, padR = 8, padT = 12, padB = 28;
  const W = 800, H = height;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const stacked = days.map(d => {
    let acc = 0;
    const parts = series.map(s => {
      const v = d.totals[s.id] || 0;
      const slice = { id: s.id, y0: acc, y1: acc + v, v };
      acc += v;
      return slice;
    });
    return { ...d, parts, total: acc };
  });
  const max = Math.max(0.001, ...stacked.map(s => s.total));
  const niceMax = niceCeil(max);
  const bw = (innerW / days.length) * 0.7;
  const step = innerW / days.length;

  const ticks = 4;
  const tickVals: number[] = [];
  for (let i = 0; i <= ticks; i++) tickVals.push((niceMax / ticks) * i);

  const xTickEvery = Math.max(1, Math.floor(days.length / 6));

  return (
    <div className="chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {tickVals.map((v, i) => {
          const y = padT + innerH - (v / niceMax) * innerH;
          return <line key={i} className="chart-grid" x1={padL} x2={W - padR} y1={y} y2={y} />;
        })}
        <g className="chart-axis-y">
          {tickVals.map((v, i) => {
            const y = padT + innerH - (v / niceMax) * innerH;
            return <text key={i} x={padL - 8} y={y + 3} textAnchor="end">{formatY(v)}</text>;
          })}
        </g>
        <g>
          {stacked.map((d, i) => {
            const cx = padL + step * i + step / 2;
            const x = cx - bw / 2;
            return d.parts.map((p, j) => {
              if (p.v <= 0) return null;
              const y1 = padT + innerH - (p.y1 / niceMax) * innerH;
              const y0 = padT + innerH - (p.y0 / niceMax) * innerH;
              const fillVar = series.find(s => s.id === p.id)!.color;
              return (
                <rect
                  key={i + "-" + j}
                  x={x} y={y1} width={bw} height={Math.max(0.5, y0 - y1)}
                  fill={fillVar}
                />
              );
            });
          })}
        </g>
        <line className="chart-axis-line" x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} />
        <g className="chart-axis-x">
          {stacked.map((d, i) => {
            if (i % xTickEvery !== 0 && i !== stacked.length - 1) return null;
            const x = padL + step * i + step / 2;
            return <text key={i} x={x} y={padT + innerH + 16} textAnchor="middle">{d.label}</text>;
          })}
        </g>
      </svg>
    </div>
  );
}

// ===== LineChart =====
export function LineChart({
  days, series, height = 200, formatY = (v: number) => fmtUSD(v, { decimals: 0 }),
}: {
  days: DailySeries[];
  series: Series[];
  height?: number;
  formatY?: (v: number) => string;
}) {
  const padL = 56, padR = 8, padT = 10, padB = 24;
  const W = 800, H = height;
  const innerW = W - padL - padR, innerH = H - padT - padB;

  const max = Math.max(0.001, ...days.flatMap(d => series.map(s => d.totals[s.id] || 0)));
  const niceMax = niceCeil(max);
  const step = innerW / Math.max(1, days.length - 1);

  function pathFor(seriesId: string) {
    return days.map((d, i) => {
      const x = padL + step * i;
      const v = d.totals[seriesId] || 0;
      const y = padT + innerH - (v / niceMax) * innerH;
      return (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
  }

  const ticks = 4;
  const tickVals: number[] = [];
  for (let i = 0; i <= ticks; i++) tickVals.push((niceMax / ticks) * i);
  const xTickEvery = Math.max(1, Math.floor(days.length / 6));

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {tickVals.map((v, i) => {
        const y = padT + innerH - (v / niceMax) * innerH;
        return <line key={i} className="chart-grid" x1={padL} x2={W - padR} y1={y} y2={y} />;
      })}
      <g className="chart-axis-y">
        {tickVals.map((v, i) => {
          const y = padT + innerH - (v / niceMax) * innerH;
          return <text key={i} x={padL - 8} y={y + 3} textAnchor="end">{formatY(v)}</text>;
        })}
      </g>
      {series.map(s => (
        <path key={s.id} d={pathFor(s.id)} fill="none" stroke={s.color} strokeWidth="1.4" />
      ))}
      <line className="chart-axis-line" x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} />
      <g className="chart-axis-x">
        {days.map((d, i) => {
          if (i % xTickEvery !== 0 && i !== days.length - 1) return null;
          const x = padL + step * i;
          return <text key={i} x={x} y={padT + innerH + 14} textAnchor="middle">{d.label}</text>;
        })}
      </g>
    </svg>
  );
}

// ===== HourHeatmap =====
export function HourHeatmap({ sessions }: { sessions: Session[] }) {
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const s of sessions) {
    const d = new Date(s.start);
    const dow = (d.getDay() + 6) % 7; // Mon=0
    const h = d.getHours();
    matrix[dow][h] += s.cost;
  }
  const max = Math.max(0.001, ...matrix.flat());
  const cell = 22;
  const w = 24 * cell + 40;
  const h = 7 * cell + 30;
  const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="chart-svg">
      {matrix.map((row, dy) => (
        <g key={dy}>
          <text x={32} y={dy * cell + cell - 6} textAnchor="end"
                fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-3)"
                letterSpacing="0.10em">{dayLabels[dy]}</text>
          {row.map((v, hx) => {
            const t = v / max;
            const opacity = v === 0 ? 0.06 : 0.15 + t * 0.85;
            return (
              <rect key={hx}
                    x={40 + hx * cell} y={dy * cell + 4}
                    width={cell - 2} height={cell - 4}
                    fill="var(--accent)"
                    opacity={opacity}>
                <title>{`${dayLabels[dy]} ${hx}:00 — ${fmtUSD(v)}`}</title>
              </rect>
            );
          })}
        </g>
      ))}
      {Array.from({ length: 24 }, (_, i) => {
        if (i % 3 !== 0) return null;
        return <text key={i} x={40 + i * cell + cell / 2 - 1} y={7 * cell + 18}
                     textAnchor="middle"
                     fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-3)">{String(i).padStart(2, "0")}</text>;
      })}
    </svg>
  );
}

// ===== Treemap (squarified) =====
export type TreemapItem = { id: string; name: string; value: number; sub: string };

export function Treemap({ items }: { items: TreemapItem[] }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const sorted = [...items].sort((a, b) => b.value - a.value);
  const cells = layoutTreemap(sorted.map(s => s.value / total), 0, 0, 100, 100);
  return (
    <div className="treemap">
      {sorted.map((it, i) => {
        const c = cells[i];
        const area = c.w * c.h;
        const cls = area < 6 ? "tiny" : area < 18 ? "small" : "";
        const isAccent = i < 2;
        return (
          <div key={it.id} className={`tm-cell ${cls}`}
               style={{
                 left: c.x + "%", top: c.y + "%",
                 width: c.w + "%", height: c.h + "%",
                 background: isAccent ? "var(--accent)" : (i < 4 ? "var(--ink)" : "var(--ink-2)"),
                 color: "var(--bg)",
               }}>
            <div className="tm-name">{it.name}</div>
            <div className="tm-val">{it.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

type Cell = { x: number; y: number; w: number; h: number };

function layoutTreemap(values: number[], x: number, y: number, w: number, h: number): Cell[] {
  const out: Cell[] = new Array(values.length);
  function place(indices: number[], x: number, y: number, w: number, h: number) {
    if (indices.length === 0) return;
    if (indices.length === 1) { out[indices[0]] = { x, y, w, h }; return; }
    const total = indices.reduce((a, i) => a + values[i], 0);
    const horiz = w >= h;
    let best: number | null = null;
    let bestAR = Infinity;
    for (let k = 1; k <= indices.length; k++) {
      const prefix = indices.slice(0, k);
      const sumP = prefix.reduce((a, i) => a + values[i], 0);
      const fraction = sumP / total;
      const rowMain = horiz ? w * fraction : h * fraction;
      const rowCross = horiz ? h : w;
      let worst = 0;
      for (const i of prefix) {
        const cellArea = (values[i] / sumP) * rowMain * rowCross;
        const side1 = rowCross;
        const side2 = cellArea / side1;
        worst = Math.max(worst, Math.max(side1 / side2, side2 / side1));
      }
      if (worst <= bestAR) { bestAR = worst; best = k; }
      else break;
    }
    const prefix = indices.slice(0, best!);
    const rest = indices.slice(best!);
    const sumP = prefix.reduce((a, i) => a + values[i], 0);
    const fraction = sumP / total;
    if (horiz) {
      const rw = w * fraction;
      let ry = y;
      for (const i of prefix) {
        const rh = (values[i] / sumP) * h;
        out[i] = { x, y: ry, w: rw, h: rh };
        ry += rh;
      }
      place(rest, x + rw, y, w - rw, h);
    } else {
      const rh = h * fraction;
      let rx = x;
      for (const i of prefix) {
        const rw = (values[i] / sumP) * w;
        out[i] = { x: rx, y, w: rw, h: rh };
        rx += rw;
      }
      place(rest, x, y + rh, w, h - rh);
    }
  }
  place(values.map((_, i) => i), x, y, w, h);
  return out;
}

// ===== Donut =====
export type DonutSegment = { id: string; value: number; color: string; label: string };

export function Donut({ segments, size = 160, thickness = 18 }: {
  segments: DonutSegment[]; size?: number; thickness?: number;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = size / 2 - thickness / 2 - 1;
  const cx = size / 2, cy = size / 2;
  // Pre-compute arc endpoints immutably via running prefix-sum (avoids
  // render-time `let` reassignment, which React 19 flags).
  const arcs = segments.reduce<{ s: DonutSegment; a0: number; a1: number; large: 0 | 1 }[]>(
    (acc, s) => {
      const start = acc.length === 0 ? -Math.PI / 2 : acc[acc.length - 1].a1;
      const frac = s.value / total;
      const end = start + frac * 2 * Math.PI;
      acc.push({ s, a0: start, a1: end, large: frac > 0.5 ? 1 : 0 });
      return acc;
    },
    [],
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map(({ s, a0, a1, large }) => {
        const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        const d = `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
        return <path key={s.id} d={d} fill="none" stroke={s.color} strokeWidth={thickness} />;
      })}
    </svg>
  );
}

export const TOKEN_KIND_COLORS: Record<string, string> = {
  in:     "var(--ink)",
  cacheR: "var(--ink-3)",
  cacheW: "var(--ink-4)",
  out:    "var(--accent)",
  reason: "var(--accent-2)",
};
export const TOKEN_KIND_LABELS: Record<string, string> = {
  in: "Input", cacheR: "Cache read", cacheW: "Cache write", out: "Output", reason: "Reasoning",
};

export function vendorColor(vendor: Vendor): string {
  if (vendor === "Anthropic") return "var(--accent)";
  if (vendor === "OpenAI") return "var(--accent-2)";
  if (vendor === "Google") return "var(--accent-3)";
  return "var(--ink-2)";
}
export function vendorLetter(vendor: Vendor): string {
  return vendor[0];
}
