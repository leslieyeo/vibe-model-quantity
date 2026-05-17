"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CLIENTS } from "@/lib/data";
import { fmtUSD, fmtCompact, fmtPct } from "@/lib/format";
import { buildPayload, leaderboardWithYou } from "@/lib/leaderboard";

export function LeaderboardView({
  nickname, optIn, setOptIn, setNickname,
}: {
  nickname: string;
  optIn: boolean;
  setOptIn: (v: boolean) => void;
  setNickname: (v: string) => void;
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  const rows = useMemo(() => leaderboardWithYou(nickname || null), [nickname]);
  const youRank = rows.find(r => r.isYou)?.rank ?? null;

  const payload = useMemo(() => buildPayload({ nickname: nickname || null, showGithub: false }), [nickname]);

  function copyPayload() {
    const json = JSON.stringify(payload, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <header className="page-head">
        <div className="lede">
          <div className="crumbs"><span>Dashboard</span><span>·</span><span>Leaderboard</span></div>
          <h1>
            {t.rich("leaderboard.headline", {
              em: (chunks) => <em>{chunks}</em>,
              br: () => <br />,
            })}
          </h1>
          <p className="summary">{t("leaderboard.summary")}</p>
        </div>
        <div className="head-stat">
          <div className="eyebrow">{t("leaderboard.yourRank")}</div>
          <div className="num">{youRank ? `#${youRank}` : "—"}</div>
          <div className="delta down" style={{ color: "var(--ink-3)" }}>{t("leaderboard.thisMonth")}</div>
        </div>
      </header>

      <section className="block" style={{ marginBottom: "var(--gap-6)", borderLeft: "3px solid var(--accent)", paddingLeft: "var(--gap-4)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--accent)", marginBottom: 6 }}>
          {t("leaderboard.previewBadge")}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
          {t("leaderboard.previewText")}
        </div>
      </section>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("leaderboard.tableTitle", { em: (c) => <em>{c}</em> })}</div>
          <div className="actions"><span className="meta">{t("leaderboard.mockNote")}</span></div>
        </div>
        <div className="tbl-scroll">
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th className="num" style={{ width: 50 }}>#</th>
                <th>{t("leaderboard.colNick")}</th>
                <th className="num">{t("leaderboard.colSpend")}</th>
                <th className="num">{t("leaderboard.colTokens")}</th>
                <th className="num">{t("leaderboard.colSessions")}</th>
                <th>{t("leaderboard.colTopVendor")}</th>
                <th className="num">{t("leaderboard.colCache")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.rank}
                    style={r.isYou ? { background: "var(--accent-soft)", outline: "1px solid var(--accent)", outlineOffset: -1 } : undefined}>
                  <td className="num" style={{ color: r.isYou ? "var(--accent)" : "var(--ink-3)" }}>
                    {r.rank}
                  </td>
                  <td>
                    <div className="cell-name">
                      <span style={{ fontWeight: r.isYou ? 600 : 400 }}>{r.nickname}</span>
                      {r.isYou && (
                        <span className="pill" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                          {t("leaderboard.youBadge")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="num" style={{ fontWeight: r.isYou ? 600 : 400 }}>{fmtUSD(r.totalCostUsd, { decimals: 0 })}</td>
                  <td className="num">{fmtCompact(r.totalTokens)}</td>
                  <td className="num">{r.sessionCount}</td>
                  <td>{r.topVendor}</td>
                  <td className="num">{r.cacheHitRate > 0 ? fmtPct(r.cacheHitRate, 0) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-l two" style={{ marginBottom: "var(--gap-7)" }}>
        <section className="block">
          <div className="block-head">
            <div className="title">{t.rich("leaderboard.optInTitle", { em: (c) => <em>{c}</em> })}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap-3)" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
              {t("leaderboard.optInBody")}
            </p>
            <div style={{ display: "flex", gap: "var(--gap-3)", alignItems: "center" }}>
              <span className="eyebrow">{t("leaderboard.optInToggle")}</span>
              <div className="twk-radio">
                <button className={optIn ? "on" : ""} onClick={() => setOptIn(true)}>{t("tweaks.on")}</button>
                <button className={!optIn ? "on" : ""} onClick={() => setOptIn(false)}>{t("tweaks.off")}</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: "var(--gap-3)", alignItems: "center" }}>
              <span className="eyebrow" style={{ minWidth: 80 }}>{t("leaderboard.nickname")}</span>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder={t("leaderboard.nicknamePlaceholder")}
                style={{
                  flex: 1,
                  background: "var(--bg)",
                  border: "1px solid var(--rule-2)",
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--ink)",
                  borderRadius: "var(--r)",
                }}
              />
            </div>
          </div>
        </section>

        <section className="block">
          <div className="block-head">
            <div className="title">{t.rich("leaderboard.payloadTitle", { em: (c) => <em>{c}</em> })}</div>
            <div className="actions">
              <button className="btn" onClick={() => setShowPayload(v => !v)}>
                {showPayload ? t("leaderboard.payloadHide") : t("leaderboard.payloadShow")}
              </button>
              <button className="btn primary" onClick={copyPayload}>
                {copied ? t("leaderboard.payloadCopied") : t("leaderboard.payloadCopy")}
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-3)", marginBottom: "var(--gap-3)" }}>
            {t("leaderboard.payloadHint")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap-3)" }}>
            <KV label={t("leaderboard.kvMonth")} value={payload.period} />
            <KV label={t("leaderboard.kvSpend")} value={fmtUSD(payload.totalCostUsd, { decimals: 0 })} />
            <KV label={t("leaderboard.kvTokens")} value={fmtCompact(payload.totalTokens)} />
            <KV label={t("leaderboard.kvSessions")} value={String(payload.sessionCount)} />
            <KV label={t("leaderboard.kvDays")} value={String(payload.daysActive)} />
            <KV label={t("leaderboard.kvCache")} value={fmtPct(payload.cacheHitRate, 0)} />
            <KV label={t("leaderboard.kvAvg")} value={fmtUSD(payload.avgDailyUsd, { decimals: 0 })} />
            <KV label={t("leaderboard.kvNick")} value={payload.nickname || "—"} />
          </div>
          {showPayload && (
            <pre style={{
              marginTop: "var(--gap-3)",
              padding: "var(--gap-3)",
              background: "var(--panel)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--r)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.45,
              maxHeight: 320,
              overflow: "auto",
              color: "var(--ink-2)",
            }}>
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </section>
      </div>

      <section className="block" style={{ marginBottom: "var(--gap-7)" }}>
        <div className="block-head">
          <div className="title">{t.rich("leaderboard.privacyTitle", { em: (c) => <em>{c}</em> })}</div>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ink-2)", fontSize: 13, lineHeight: 1.7 }}>
          <li>{t("leaderboard.privacy1")}</li>
          <li>{t("leaderboard.privacy2")}</li>
          <li>{t("leaderboard.privacy3")}</li>
          <li>{t("leaderboard.privacy4")}</li>
        </ul>
        <div className="row" style={{ marginTop: "var(--gap-3)", gap: "var(--gap-4)" }}>
          <div className="eyebrow">{t("leaderboard.clientsCovered")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CLIENTS.map(c => (
              <span key={c.id} className="pill">{c.short}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="eyebrow">{label}</span>
      <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}
