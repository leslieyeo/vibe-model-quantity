"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CLIENTS, MODELS, PROJECTS, NOW,
  buildDailySeriesByKey, dayBuckets, dayKey, dayLabel,
  formatRangeLabel, previousWindow, rangeWindow, sessionsIn, sumTokens, topAggregates,
  type DailySeries, type Range, type Session,
} from "@/lib/data";
import { fmtUSD, fmtCompact, fmtPct } from "@/lib/format";
import {
  Donut, HourHeatmap, LineChart, Sparkline, StackedBarChart, Treemap,
  vendorColor, vendorLetter,
} from "@/components/charts";
import { SessionRow } from "@/components/session-row";

type ViewProps = {
  range: Range;
  onOpenSession: (s: Session) => void;
};

// Rich-text helpers reused across views
const richEm = (chunks: React.ReactNode) => <em>{chunks}</em>;
const richBr = () => <br />;
const richNeg = (chunks: React.ReactNode) => <strong style={{ color: "var(--neg)" }}>{chunks}</strong>;
const richPos = (chunks: React.ReactNode) => <span style={{ color: "var(--pos)" }}>{chunks}</span>;

// =============================================================================
// Overview
// =============================================================================
export function OverviewView({ range, onOpenSession }: ViewProps) {
  const t = useTranslations();
  const { start, end } = rangeWindow(range);
  const { start: pStart, end: pEnd } = previousWindow(range);
  const sessions = sessionsIn(start, end);
  const prevSessions = sessionsIn(pStart, pEnd);
  const cur = sumTokens(sessions);
  const prev = sumTokens(prevSessions);

  const days = dayBuckets(start, end);
  const span = days.length;

  const topClients = topAggregates(sessions, s => s.client).slice(0, 6);
  const clientSeries = topClients.map((c, i) => ({
    id: c.key,
    name: CLIENTS.find(x => x.id === c.key)?.name || c.key,
    color: [
      "var(--ink)", "var(--accent)", "var(--ink-2)",
      "var(--accent-2)", "var(--ink-3)", "var(--accent-3)",
    ][i],
  }));
  const dailyByClient = buildDailySeriesByKey(sessions, days, s => s.client);

  const topModels = topAggregates(sessions, s => s.model).slice(0, 8);

  const tokenComp = [
    { id: "in",     value: cur.tokens.in,     color: "var(--ink)",     label: t("drawer.labelInput") },
    { id: "cacheR", value: cur.tokens.cacheR, color: "var(--ink-3)",   label: t("drawer.labelCacheRead") },
    { id: "cacheW", value: cur.tokens.cacheW, color: "var(--ink-4)",   label: t("drawer.labelCacheWrite") },
    { id: "out",    value: cur.tokens.out,    color: "var(--accent)",  label: t("drawer.labelOutput") },
    { id: "reason", value: cur.tokens.reason, color: "var(--accent-2)",label: t("drawer.labelReasoning") },
  ];

  const totalTokens = tokenComp.reduce((a, b) => a + b.value, 0);
  const avgDay = cur.cost / Math.max(1, span);
  const prevAvg = prev.cost / Math.max(1, span);
  const dayDelta = prevAvg > 0 ? (avgDay - prevAvg) / prevAvg : 0;
  const costDelta = prev.cost > 0 ? (cur.cost - prev.cost) / prev.cost : 0;
  const sessionsDelta = prev.count > 0 ? (cur.count - prev.count) / prev.count : 0;

  let savedCache = 0;
  for (const s of sessions) {
    const m = MODELS.find(x => x.id === s.model);
    if (!m) continue;
    savedCache += (s.tokens.cacheR / 1_000_000) * (m.prices.in - m.prices.cacheR);
  }
  const cacheRate = totalTokens > 0 ? cur.tokens.cacheR / totalTokens : 0;

  const rangeLabel = formatRangeLabel(start, end);
  const rangeProse = t(`rangeProse.${range}`);
  const cacheTip = cacheRate > 0.55 ? t("overview.cacheTipHigh") : t("overview.cacheTipLow");

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs">
            <span>Dashboard</span><span>·</span><span>Overview</span><span>·</span>
            <span className="mono">{rangeLabel}</span>
          </div>
          <h1>
            {t.rich("overview.headline", {
              amount: fmtUSD(cur.cost, { decimals: 0 }),
              em: richEm,
              br: richBr,
            })}
          </h1>
          <p className="summary">
            {t("overview.summary", {
              count: cur.count,
              clients: topClients.length,
              models: topModels.length,
              range: rangeProse,
              cacheTip,
            })}
          </p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("overview.dailyAverage")}</div>
          <div className="num">{fmtUSD(avgDay, { decimals: 0 })}</div>
          <div className={`delta ${dayDelta < 0 ? "down" : ""}`}>
            {fmtPct(Math.abs(dayDelta))} {t("overview.vsPrior")}
          </div>
        </div>
      </header>

      <div className="kpi-row">
        <div className="kpi">
          <div className="label">Spend</div>
          <div className="value">{fmtUSD(cur.cost, { decimals: 0 })}</div>
          <div className="sub">
            <span className={`delta ${costDelta < 0 ? "down" : ""}`}>{fmtPct(Math.abs(costDelta))}</span>
            <span>{t("overview.vsPrior")}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Tokens</div>
          <div className="value">{fmtCompact(totalTokens)}</div>
          <div className="sub"><span>{fmtCompact(cur.tokens.out)} out</span></div>
        </div>
        <div className="kpi">
          <div className="label">Sessions</div>
          <div className="value">{cur.count.toLocaleString()}</div>
          <div className="sub">
            <span className={`delta ${sessionsDelta < 0 ? "down" : ""}`}>{fmtPct(Math.abs(sessionsDelta))}</span>
            <span>{t("overview.vsPrior")}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="label">Cache hit</div>
          <div className="value">{fmtPct(cacheRate, 0)}</div>
          <div className="sub"><span>saved ≈ {fmtUSD(savedCache, { decimals: 0 })}</span></div>
        </div>
        <div className="kpi">
          <div className="label">Burn rate</div>
          <div className="value">{fmtUSD(avgDay, { decimals: 0 })}<span className="unit">/day</span></div>
          <div className="sub"><span>{fmtUSD(avgDay / 8, { decimals: 2 })} / work-hr</span></div>
        </div>
      </div>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("overview.blockSpendByClient", { em: richEm })}</div>
          <div className="actions"><span className="meta">{rangeLabel}</span></div>
        </div>
        <StackedBarChart days={dailyByClient} series={clientSeries} height={260} />
        <div className="chart-legend">
          {clientSeries.map(s => {
            const total = dailyByClient.reduce((a, d) => a + (d.totals[s.id] || 0), 0);
            return (
              <div className="item" key={s.id}>
                <span className="sw" style={{ background: s.color }}></span>
                <span>{s.name}</span>
                <span className="val">{fmtUSD(total, { decimals: 0 })}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid-l two" style={{ marginBottom: "var(--gap-7)" }}>
        <section className="block">
          <div className="block-head">
            <div className="title">{t.rich("overview.blockTopModels", { em: richEm })}</div>
            <div className="actions"><span className="meta">{t("overview.blockByCost")}</span></div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Tokens</th>
                <th className="num">Spend</th>
                <th className="num" style={{ width: 96 }}>Share</th>
                <th className="num" style={{ width: 100 }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {topModels.map(m => {
                const meta = MODELS.find(x => x.id === m.key)!;
                const share = m.cost / Math.max(0.0001, cur.cost);
                const series = days.map(d =>
                  sessions.filter(s => s.model === m.key && dayKey(s.start) === d.key)
                    .reduce((a, s) => a + s.cost, 0)
                );
                return (
                  <tr key={m.key}>
                    <td>
                      <div className="cell-name">
                        <span className={`pill vendor-${vendorLetter(meta.vendor)}`}>{meta.vendor[0]}</span>
                        <span>{meta.display}</span>
                      </div>
                    </td>
                    <td className="num">{fmtCompact(m.tokens)}</td>
                    <td className="num">{fmtUSD(m.cost, { decimals: 0 })}</td>
                    <td className="num bar-cell">
                      <span className="bar-bg">
                        <span className="bar-fg" style={{ width: (share * 100).toFixed(1) + "%" }}></span>
                      </span>
                    </td>
                    <td className="num"><Sparkline values={series} width={90} height={26} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="block">
          <div className="block-head">
            <div className="title">{t.rich("overview.blockTokenComposition", { em: richEm })}</div>
            <div className="actions"><span className="meta">{t("overview.blockTotal", { n: fmtCompact(totalTokens) })}</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-3)", alignItems: "center" }}>
            <Donut segments={tokenComp} size={150} thickness={18} />
            <table className="tbl" style={{ width: "100%" }}>
              <tbody>
                {tokenComp.map(tk => (
                  <tr key={tk.id}>
                    <td>
                      <div className="cell-name">
                        <span style={{ width: 10, height: 10, background: tk.color, flex: "none" }}></span>
                        <span>{tk.label}</span>
                      </div>
                    </td>
                    <td className="num">{fmtCompact(tk.value)}</td>
                    <td className="num muted" style={{ width: 44 }}>{fmtPct(tk.value / Math.max(1, totalTokens), 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("overview.blockRecentSessions", { em: richEm })}</div>
          <div className="actions"><span className="meta">{t("overview.blockShowing", { n: cur.count, shown: 8 })}</span></div>
        </div>
        <div className="session-list">
          {sessions.slice(0, 8).map(s => <SessionRow key={s.id} session={s} onClick={() => onOpenSession(s)} />)}
        </div>
      </section>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("overview.blockWhenBurn", { em: richEm })}</div>
          <div className="actions"><span className="meta">{t("overview.blockByHour")}</span></div>
        </div>
        <HourHeatmap sessions={sessions} />
      </section>
    </>
  );
}

// =============================================================================
// Models
// =============================================================================
export function ModelsView({ range }: ViewProps) {
  const t = useTranslations();
  const { start, end } = rangeWindow(range);
  const sessions = sessionsIn(start, end);
  const days = dayBuckets(start, end);
  const all = topAggregates(sessions, s => s.model);
  const total = all.reduce((a, b) => a + b.cost, 0);

  const tm = all.slice(0, 12).map(a => {
    const m = MODELS.find(x => x.id === a.key)!;
    return { id: a.key, name: m.display, value: a.cost, sub: fmtUSD(a.cost, { decimals: 0 }) };
  });

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs"><span>Dashboard</span><span>·</span><span>Models</span></div>
          <h1>{t.rich("models.headline", { em: richEm })}</h1>
          <p className="summary">{t("models.summary", { count: all.length })}</p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("models.modelsTouched")}</div>
          <div className="num">{all.length}</div>
          <div className="delta down">{t("models.totalSuffix", { amount: fmtUSD(total, { decimals: 0 }) })}</div>
        </div>
      </header>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("models.blockTreemap", { em: richEm })}</div>
          <div className="actions"><span className="meta">{t("models.blockShare")}</span></div>
        </div>
        <Treemap items={tm} />
      </section>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head"><div className="title">{t.rich("models.blockAll", { em: richEm })}</div></div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Vendor</th>
                <th className="num">In</th>
                <th className="num">Cache R</th>
                <th className="num">Out</th>
                <th className="num">Reason</th>
                <th className="num">Cache %</th>
                <th className="num">$ / 1M (in/out)</th>
                <th className="num">Sessions</th>
                <th className="num">Spend</th>
                <th className="num" style={{ width: 110 }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {all.map(row => {
                const m = MODELS.find(x => x.id === row.key)!;
                const slice = sessions.filter(s => s.model === row.key);
                const tk = sumTokens(slice).tokens;
                const allTok = tk.in + tk.cacheR + tk.cacheW + tk.out + tk.reason;
                const cacheShare = allTok > 0 ? tk.cacheR / allTok : 0;
                const series = days.map(d => slice.filter(s => dayKey(s.start) === d.key).reduce((a, s) => a + s.cost, 0));
                return (
                  <tr key={row.key}>
                    <td>
                      <div className="cell-name">
                        <span style={{ width: 8, height: 8, background: vendorColor(m.vendor) }}></span>
                        <span>{m.display}</span>
                      </div>
                    </td>
                    <td>{m.vendor}</td>
                    <td className="num">{fmtCompact(tk.in)}</td>
                    <td className="num">{fmtCompact(tk.cacheR)}</td>
                    <td className="num">{fmtCompact(tk.out)}</td>
                    <td className="num">{tk.reason > 0 ? fmtCompact(tk.reason) : "—"}</td>
                    <td className="num">{fmtPct(cacheShare, 0)}</td>
                    <td className="num muted">${m.prices.in.toFixed(2)} / ${m.prices.out.toFixed(2)}</td>
                    <td className="num">{row.sessions}</td>
                    <td className="num">{fmtUSD(row.cost, { decimals: 0 })}</td>
                    <td className="num"><Sparkline values={series} width={100} height={28} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// =============================================================================
// Clients
// =============================================================================
export function ClientsView({ range }: ViewProps) {
  const t = useTranslations();
  const { start, end } = rangeWindow(range);
  const sessions = sessionsIn(start, end);
  const days = dayBuckets(start, end);
  const agg = topAggregates(sessions, s => s.client);
  const total = agg.reduce((a, b) => a + b.cost, 0);

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs"><span>Dashboard</span><span>·</span><span>Clients</span></div>
          <h1>{t.rich("clients.headline", { em: richEm })}</h1>
          <p className="summary">{t("clients.summary")}</p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("clients.active")}</div>
          <div className="num">{agg.length}</div>
          <div className="delta down">{t("models.totalSuffix", { amount: fmtUSD(total, { decimals: 0 }) })}</div>
        </div>
      </header>

      <div className="grid-l three" style={{ marginBottom: "var(--gap-7)" }}>
        {agg.map(row => {
          const c = CLIENTS.find(x => x.id === row.key)!;
          const slice = sessions.filter(s => s.client === row.key);
          const series = days.map(d => slice.filter(s => dayKey(s.start) === d.key).reduce((a, s) => a + s.cost, 0));
          const max = Math.max(...series, 0.0001);
          const byModel = topAggregates(slice, s => s.model);
          const topModel = byModel[0] ? MODELS.find(x => x.id === byModel[0].key) : null;
          return (
            <div className="client-card" key={row.key}>
              <div className="top">
                <div className="name">{c.name}</div>
                <span className="badge">{c.kind}</span>
              </div>
              <div>
                <div className="num-big mono">{fmtUSD(row.cost, { decimals: 0 })}</div>
                <div className="num-sub">
                  <span>{fmtCompact(row.tokens)} tok</span>
                  <span>·</span>
                  <span>{row.sessions} sessions</span>
                </div>
              </div>
              <div className="micro">
                {series.map((v, i) => (
                  <span key={i}
                    className={`bar ${i < series.length - 7 ? "dim" : ""}`}
                    style={{ height: Math.max(1, (v / max) * 36) + "px" }}></span>
                ))}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                {t("clients.topModel")} · <span style={{ color: "var(--ink)" }}>{topModel?.display || "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head"><div className="title">{t.rich("clients.blockDaily", { em: richEm })}</div></div>
        {(() => {
          const dailyByClient = buildDailySeriesByKey(sessions, days, s => s.client);
          const series = agg.slice(0, 6).map((c, i) => ({
            id: c.key,
            name: CLIENTS.find(x => x.id === c.key)!.name,
            color: ["var(--ink)", "var(--accent)", "var(--ink-2)", "var(--accent-2)", "var(--ink-3)", "var(--accent-3)"][i],
          }));
          return (
            <>
              <LineChart days={dailyByClient} series={series} height={220} />
              <div className="chart-legend">
                {series.map(s => (
                  <div className="item" key={s.id}>
                    <span className="sw" style={{ background: s.color }}></span>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </section>
    </>
  );
}

// =============================================================================
// Projects
// =============================================================================
export function ProjectsView({ range }: ViewProps) {
  const t = useTranslations();
  const { start, end } = rangeWindow(range);
  const sessions = sessionsIn(start, end);
  const days = dayBuckets(start, end);
  const agg = topAggregates(sessions, s => s.project);
  const total = agg.reduce((a, b) => a + b.cost, 0);

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs"><span>Dashboard</span><span>·</span><span>Projects</span></div>
          <h1>{t.rich("projects.headline", { em: richEm })}</h1>
          <p className="summary">{t("projects.summary")}</p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("projects.touched")}</div>
          <div className="num">{agg.length}</div>
          <div className="delta down">{t("models.totalSuffix", { amount: fmtUSD(total, { decimals: 0 }) })}</div>
        </div>
      </header>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Path</th>
                <th className="num">Sessions</th>
                <th className="num">Tokens</th>
                <th className="num">Top model</th>
                <th className="num">Last activity</th>
                <th className="num" style={{ width: 96 }}>Share</th>
                <th className="num" style={{ width: 100 }}>Trend</th>
                <th className="num">Spend</th>
              </tr>
            </thead>
            <tbody>
              {agg.map(row => {
                const p = PROJECTS.find(x => x.id === row.key)!;
                const slice = sessions.filter(s => s.project === row.key);
                const byModel = topAggregates(slice, s => s.model);
                const topModel = MODELS.find(x => x.id === byModel[0]?.key);
                const last = slice[0] ? new Date(slice[0].start) : null;
                const series = days.map(d => slice.filter(s => dayKey(s.start) === d.key).reduce((a, s) => a + s.cost, 0));
                const share = row.cost / Math.max(0.001, total);
                return (
                  <tr key={row.key}>
                    <td><span className="cell-name"><span>{p.name}</span></span></td>
                    <td className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>{p.path}</td>
                    <td className="num">{row.sessions}</td>
                    <td className="num">{fmtCompact(row.tokens)}</td>
                    <td className="num">{topModel?.display || "—"}</td>
                    <td className="num muted">{last ? last.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</td>
                    <td className="num bar-cell">
                      <span className="bar-bg"><span className="bar-fg" style={{ width: (share * 100).toFixed(1) + "%" }}></span></span>
                    </td>
                    <td className="num"><Sparkline values={series} width={90} height={26} /></td>
                    <td className="num">{fmtUSD(row.cost, { decimals: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

// =============================================================================
// Sessions
// =============================================================================
export function SessionsView({ range, onOpenSession }: ViewProps) {
  const t = useTranslations();
  const { start, end } = rangeWindow(range);
  const sessions = sessionsIn(start, end);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");

  const filtered = sessions.filter(s =>
    (filterClient === "all" || s.client === filterClient) &&
    (filterProject === "all" || s.project === filterProject)
  );
  const total = filtered.reduce((a, s) => a + s.cost, 0);

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs"><span>Dashboard</span><span>·</span><span>Sessions</span></div>
          <h1>{t.rich("sessions.headline", { em: richEm })}</h1>
          <p className="summary">{t("sessions.summary")}</p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("sessions.inRange")}</div>
          <div className="num">{filtered.length}</div>
          <div className="delta down">{t("models.totalSuffix", { amount: fmtUSD(total, { decimals: 0 }) })}</div>
        </div>
      </header>

      <section className="block" style={{ marginBottom: "var(--gap-5)" }}>
        <div className="block-head">
          <div className="title">{t("sessions.blockFilter")}</div>
          <div className="actions" style={{ gap: "var(--gap-3)" }}>
            <div className="seg">
              <button className={filterClient === "all" ? "on" : ""} onClick={() => setFilterClient("all")}>{t("sessions.allClients")}</button>
              {CLIENTS.map(c => (
                <button key={c.id} className={filterClient === c.id ? "on" : ""} onClick={() => setFilterClient(c.id)}>{c.short}</button>
              ))}
            </div>
            <div className="seg">
              <button className={filterProject === "all" ? "on" : ""} onClick={() => setFilterProject("all")}>{t("sessions.allProjects")}</button>
              {PROJECTS.slice(0, 4).map(p => (
                <button key={p.id} className={filterProject === p.id ? "on" : ""} onClick={() => setFilterProject(p.id)}>{p.name.slice(0, 10)}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="session-list">
          {filtered.slice(0, 40).map(s => <SessionRow key={s.id} session={s} onClick={() => onOpenSession(s)} />)}
        </div>
        {filtered.length > 40 && (
          <div className="footnote" style={{ borderTop: "none", marginTop: 0 }}>
            <span>{t("sessions.showingPage", { shown: 40, total: filtered.length })}</span>
            <span>{t("sessions.inView", { amount: fmtUSD(total, { decimals: 0 }) })}</span>
          </div>
        )}
      </section>
    </>
  );
}

// =============================================================================
// Budget
// =============================================================================
export function BudgetView({ budget, setBudget }: { budget: number; setBudget: (n: number) => void }) {
  const t = useTranslations();
  const { start } = rangeWindow("mtd");
  const sessions = sessionsIn(start, new Date(NOW));
  const totals = sumTokens(sessions);
  const today = new Date(NOW);
  const dom = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const pct = totals.cost / budget;
  const projected = (totals.cost / dom) * daysInMonth;
  const projectedPct = projected / budget;
  const burnRate = totals.cost / dom;
  const monthFrac = dom / daysInMonth;

  const cumDays = dayBuckets(new Date(today.getFullYear(), today.getMonth(), 1), today);
  // Build cumulative series via reduce — running total without render-time let.
  const cumSeries = cumDays.reduce<DailySeries[]>((acc, d, idx) => {
    const prev = acc.length === 0 ? 0 : acc[acc.length - 1].totals.cum;
    const dayTotal = sessions.filter(s => dayKey(s.start) === d.key).reduce((a, s) => a + s.cost, 0);
    acc.push({
      ...d,
      label: dayLabel(d.date, cumDays.length),
      totals: { cum: prev + dayTotal, budgetLine: (budget / daysInMonth) * (idx + 1) },
    });
    return acc;
  }, []);

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs">
            <span>Dashboard</span><span>·</span><span>Budget</span><span>·</span>
            <span className="mono">{t("budget.month")}</span>
          </div>
          <h1>
            {t.rich("budget.headline", {
              spent: fmtUSD(totals.cost, { decimals: 0 }),
              cap: fmtUSD(budget, { decimals: 0 }),
              em: richEm,
              br: richBr,
            })}
          </h1>
          <p className="summary">
            {projected > budget
              ? t.rich("budget.summaryOver", {
                  projected: fmtUSD(projected, { decimals: 0 }),
                  over: fmtPct((projected - budget) / budget, 0),
                  neg: richNeg,
                })
              : t.rich("budget.summaryUnder", {
                  projected: fmtUSD(projected, { decimals: 0 }),
                  under: fmtPct((budget - projected) / budget, 0),
                  pos: richPos,
                })}
          </p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("budget.burnRate")}</div>
          <div className="num">{fmtUSD(burnRate, { decimals: 0 })}</div>
          <div className="delta down" style={{ color: "var(--ink-3)" }}>
            {t("budget.perDayMonth", { dom, daysInMonth })}
          </div>
        </div>
      </header>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("budget.blockMonthly", { em: richEm })}</div>
          <div className="actions">
            <button className="btn" onClick={() => setBudget(Math.max(100, budget - 500))}>− $500</button>
            <span className="mono" style={{ fontSize: 16, padding: "0 8px" }}>{fmtUSD(budget, { decimals: 0 })}</span>
            <button className="btn" onClick={() => setBudget(budget + 500)}>+ $500</button>
          </div>
        </div>
        <div className="budget-meter">
          <div className="meter-track">
            <div className={`meter-fill ${pct > 1 ? "over" : ""}`} style={{ width: Math.min(100, pct * 100) + "%" }}></div>
            <div className="meter-trail" data-label={`MONTH ${(monthFrac * 100).toFixed(0)}%`} style={{ left: (monthFrac * 100) + "%" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
            <span>$0</span>
            <span style={{ color: "var(--ink)" }}>{t("budget.spentLabel", { pct: fmtPct(pct, 1) })}</span>
            <span>{fmtUSD(budget, { decimals: 0 })}</span>
          </div>
        </div>
      </section>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("budget.blockCumulative", { em: richEm })}</div>
          <div className="actions"><span className="meta">{t("budget.month")}</span></div>
        </div>
        <LineChart
          days={cumSeries}
          series={[
            { id: "cum",        name: t("budget.actualLegend"),  color: "var(--ink)" },
            { id: "budgetLine", name: t("budget.pacedLegend"),   color: "var(--accent)" },
          ]}
          height={240}
        />
        <div className="chart-legend">
          <div className="item"><span className="sw" style={{ background: "var(--ink)" }}></span><span>{t("budget.actualLegend")}</span><span className="val">{fmtUSD(totals.cost, { decimals: 0 })}</span></div>
          <div className="item"><span className="sw" style={{ background: "var(--accent)" }}></span><span>{t("budget.pacedLegend")}</span><span className="val">{fmtUSD((budget / daysInMonth) * dom, { decimals: 0 })}</span></div>
        </div>
      </section>

      <div className="grid-l two" style={{ marginBottom: "var(--gap-7)" }}>
        <section className="block">
          <div className="block-head"><div className="title">{t("budget.blockProjection")}</div></div>
          <table className="tbl">
            <tbody>
              <tr><td>{t("budget.rowProjection")}</td><td className="num">{fmtUSD(projected, { decimals: 0 })}</td><td className="num muted">{t("budget.ofBudget", { pct: fmtPct(projectedPct, 0) })}</td></tr>
              <tr><td>{t("budget.rowQuarter")}</td><td className="num">{fmtUSD(projected * 3, { decimals: 0 })}</td><td className="num muted">—</td></tr>
              <tr><td>{t("budget.rowYear")}</td><td className="num">{fmtUSD(projected * 12, { decimals: 0 })}</td><td className="num muted">—</td></tr>
              <tr><td>{t("budget.rowPerHour")}</td><td className="num">{fmtUSD(burnRate / 8, { decimals: 2 })}</td><td className="num muted">{t("budget.perHourAssume")}</td></tr>
            </tbody>
          </table>
        </section>
        <section className="block">
          <div className="block-head"><div className="title">{t.rich("budget.blockBiggest", { em: richEm })}</div></div>
          <table className="tbl">
            <tbody>
              {topAggregates(sessions, s => s.model).slice(0, 5).map(row => {
                const m = MODELS.find(x => x.id === row.key)!;
                return (
                  <tr key={row.key}>
                    <td>
                      <div className="cell-name">
                        <span className={`pill vendor-${vendorLetter(m.vendor)}`}>{m.vendor[0]}</span>
                        <span>{m.display}</span>
                      </div>
                    </td>
                    <td className="num">{fmtUSD(row.cost, { decimals: 0 })}</td>
                    <td className="num muted">{fmtPct(row.cost / totals.cost, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
