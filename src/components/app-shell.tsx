"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { NOW, RANGES, SESSIONS, addModel, addProject, setSessions, type Range, type Session, type Vendor } from "@/lib/data";
import { SessionDrawer } from "@/components/session-drawer";
import {
  BudgetView, ClientsView, ModelsView, OverviewView, ProjectsView, SessionsView,
} from "@/components/views";
import { LeaderboardView } from "@/components/leaderboard-view";
import enMessages from "@/messages/en.json";
import zhMessages from "@/messages/zh.json";

type Locale = "en" | "zh";
const MESSAGES: Record<Locale, Record<string, unknown>> = { en: enMessages, zh: zhMessages };

type ViewId = "overview" | "models" | "clients" | "projects" | "sessions" | "budget" | "leaderboard";
type Theme = "paper" | "ink" | "terminal";
type Accent = "orange" | "ink" | "moss" | "crimson";
type Density = "comfortable" | "compact" | "dense";

const ACCENT_SWATCHES: { id: Accent; color: string }[] = [
  { id: "orange",  color: "oklch(0.58 0.16 45)"  },
  { id: "ink",     color: "oklch(0.30 0.06 260)" },
  { id: "moss",    color: "oklch(0.45 0.10 150)" },
  { id: "crimson", color: "oklch(0.50 0.16 20)"  },
];

export function AppShell() {
  const [locale, setLocale] = useState<Locale>("zh");

  // Restore locale from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("vmq.locale") : null;
    if (saved === "en" || saved === "zh") setLocale(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("vmq.locale", locale);
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone="UTC" now={NOW}>
      <AppContent locale={locale} setLocale={setLocale} />
    </NextIntlClientProvider>
  );
}

type Diagnostic = {
  client: string;
  installed: boolean;
  filesScanned: number;
  sessions: number;
  notes: string[];
};

function AppContent({ locale, setLocale }: { locale: Locale; setLocale: (l: Locale) => void }) {
  const t = useTranslations();
  const [view, setView] = useState<ViewId>("overview");
  const [range, setRange] = useState<Range>("7d");
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [budget, setBudget] = useState(2500);

  const [theme, setTheme] = useState<Theme>("paper");
  const [accent, setAccent] = useState<Accent>("orange");
  const [density, setDensity] = useState<Density>("comfortable");
  const [grain, setGrain] = useState(true);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [, forceRender] = useState(0);

  const [optIn, setOptIn] = useState(false);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const o = typeof window !== "undefined" ? localStorage.getItem("vmq.lb.optIn") : null;
    const n = typeof window !== "undefined" ? localStorage.getItem("vmq.lb.nickname") : null;
    if (o === "1") setOptIn(true);
    if (n) setNickname(n);
  }, []);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("vmq.lb.optIn", optIn ? "1" : "0"); }, [optIn]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("vmq.lb.nickname", nickname); }, [nickname]);

  useEffect(() => {
    let alive = true;
    setLoadingState("loading");
    fetch("/api/sessions")
      .then(r => r.json())
      .then((data: { sessions: Session[]; models: { id: string; display: string; vendor: Vendor; prices: { in: number; cacheR: number; cacheW: number; out: number; reason: number } }[]; projects: { id: string; name: string; path: string }[]; diagnostics: Diagnostic[] }) => {
        if (!alive) return;
        setSessions(data.sessions);
        for (const m of data.models) addModel(m);
        for (const p of data.projects) addProject(p);
        setDiagnostics(data.diagnostics);
        setLoadingState("ready");
        forceRender(x => x + 1);
      })
      .catch(() => alive && setLoadingState("error"));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = theme;
    r.dataset.accent = accent;
    r.dataset.density = density;
    document.body.classList.toggle("has-grain", grain && theme === "paper");
  }, [theme, accent, density, grain]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (openSession) setOpenSession(null);
        else if (tweaksOpen) setTweaksOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSession, tweaksOpen]);

  const NAV = [
    { group: t("sidebar.groupStats"), items: [
      { id: "overview" as ViewId, num: "01", label: t("sidebar.overview") },
      { id: "models" as ViewId,    num: "02", label: t("sidebar.models") },
      { id: "clients" as ViewId,   num: "03", label: t("sidebar.clients") },
      { id: "projects" as ViewId,  num: "04", label: t("sidebar.projects") },
      { id: "sessions" as ViewId,  num: "05", label: t("sidebar.sessions") },
    ]},
    { group: t("sidebar.groupControl"), items: [
      { id: "budget" as ViewId, num: "06", label: t("sidebar.budget") },
      // v2: { id: "leaderboard" as ViewId, num: "07", label: t("sidebar.leaderboard") },
    ]},
  ];

  const dt = NOW;
  // Date always in English mono for terminal/editorial feel — keep in English regardless of locale
  const dateStr = dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
  const timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="app notranslate" translate="no">
      <header className="topbar" translate="no">
        <div className="brand">
          <div className="brand-mark">v</div>
          <svg className="brand-name" viewBox="0 0 200 28" width="200" height="28" aria-label="vibeModelQuantity">
            <text x="0" y="22" fontFamily="var(--font-display)" fontSize="22" fill="currentColor">
              vibe<tspan fontStyle="italic" fill="var(--ink-2)">Model</tspan>Quantity
            </text>
          </svg>
        </div>
        <div className="center">
          <svg width="280" height="50" viewBox="0 0 280 50" style={{ display: "block" }}>
            <text x="0" y="14" fontFamily="var(--font-mono)" fontSize="10" letterSpacing="1.4" fill="var(--ink-3)">{dateStr}</text>
            <text x="0" y="42" fontFamily="var(--font-display)" fontSize="22" fill="currentColor">
              {timeStr}
              <tspan fontFamily="var(--font-mono)" fontSize="11" fill="var(--ink-3)" dx="8" dy="-2">LOCAL</tspan>
            </text>
          </svg>
        </div>
        <div className="right">
          <div className="range-tabs">
            {RANGES.map(r => (
              <button key={r.id} className={range === r.id ? "on" : ""} onClick={() => setRange(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
          <span className="live">Tailing logs</span>
        </div>
      </header>

      <aside className="sidebar">
        {NAV.map(g => (
          <div className="nav-group" key={g.group}>
            <div className="group-label">{g.group}</div>
            <nav>
              {g.items.map(it => (
                <button
                  key={it.id}
                  className={`nav-item ${view === it.id ? "on" : ""}`}
                  onClick={() => setView(it.id)}>
                  <span className="marker"></span>
                  <span>{it.label}</span>
                  <span className="num">{it.num}</span>
                </button>
              ))}
            </nav>
          </div>
        ))}
        <div className="foot">
          <div>~/.vibemodel/logs</div>
          <div style={{ color: "var(--ink-4)" }}>v0.4.2 · localhost:7414</div>
        </div>
      </aside>

      <main className="main">
        {view === "overview" && <OverviewView range={range} onOpenSession={setOpenSession} />}
        {view === "models"   && <ModelsView   range={range} onOpenSession={setOpenSession} />}
        {view === "clients"  && <ClientsView  range={range} onOpenSession={setOpenSession} />}
        {view === "projects" && <ProjectsView range={range} onOpenSession={setOpenSession} />}
        {view === "sessions" && <SessionsView range={range} onOpenSession={setOpenSession} />}
        {view === "budget"   && <BudgetView   budget={budget} setBudget={setBudget} />}
        {/* v2: leaderboard hidden; opt-in state still wired so localStorage survives */}
        {false && view === "leaderboard" && (
          <LeaderboardView nickname={nickname} optIn={optIn} setNickname={setNickname} setOptIn={setOptIn} />
        )}

        <div className="footnote">
          <span>{t("footer.left")}</span>
          <span>{t("footer.right", { count: SESSIONS.length })}</span>
        </div>
      </main>

      {openSession && <SessionDrawer session={openSession} onClose={() => setOpenSession(null)} />}

      <button className="tweaks-fab" onClick={() => setTweaksOpen(o => !o)}>
        {tweaksOpen ? t("topbar.close") : t("topbar.tweaks")}
      </button>
      {tweaksOpen && (
        <div className="tweaks-panel">
          <div className="twk-section">
            <div className="twk-label">{t("tweaks.theme")}</div>
            <div className="twk-row">
              <span>{t("tweaks.mode")}</span>
              <div className="twk-radio">
                <button className={theme === "paper" ? "on" : ""} onClick={() => setTheme("paper")}>{t("tweaks.themePaper")}</button>
                <button className={theme === "ink" ? "on" : ""} onClick={() => setTheme("ink")}>{t("tweaks.themeInk")}</button>
                <button className={theme === "terminal" ? "on" : ""} onClick={() => setTheme("terminal")}>{t("tweaks.themeTerminal")}</button>
              </div>
            </div>
            <div className="twk-row">
              <span>{t("tweaks.accent")}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {ACCENT_SWATCHES.map(s => (
                  <button key={s.id} className="twk-swatch"
                    style={{
                      background: s.color,
                      border: accent === s.id ? "2px solid var(--ink)" : "1px solid var(--rule-2)",
                    }}
                    onClick={() => setAccent(s.id)}>
                    {accent === s.id && <span style={{ display: "block", width: 6, height: 6, background: "var(--bg)", borderRadius: "50%" }}></span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="twk-row">
              <span>{t("tweaks.grain")}</span>
              <div className="twk-radio">
                <button className={grain ? "on" : ""} onClick={() => setGrain(true)}>{t("tweaks.on")}</button>
                <button className={!grain ? "on" : ""} onClick={() => setGrain(false)}>{t("tweaks.off")}</button>
              </div>
            </div>
          </div>

          <div className="twk-section">
            <div className="twk-label">{t("tweaks.layout")}</div>
            <div className="twk-row">
              <span>{t("tweaks.density")}</span>
              <div className="twk-radio">
                <button className={density === "comfortable" ? "on" : ""} onClick={() => setDensity("comfortable")}>{t("tweaks.densityComfortable")}</button>
                <button className={density === "compact" ? "on" : ""} onClick={() => setDensity("compact")}>{t("tweaks.densityCompact")}</button>
                <button className={density === "dense" ? "on" : ""} onClick={() => setDensity("dense")}>{t("tweaks.densityDense")}</button>
              </div>
            </div>
          </div>

          <div className="twk-section">
            <div className="twk-label">{t("tweaks.language")}</div>
            <div className="twk-row">
              <span>Locale</span>
              <div className="twk-radio">
                <button className={locale === "en" ? "on" : ""} onClick={() => setLocale("en")}>EN</button>
                <button className={locale === "zh" ? "on" : ""} onClick={() => setLocale("zh")}>中文</button>
              </div>
            </div>
          </div>

          <div className="twk-section">
            <div className="twk-label">{t("tweaks.budget")}</div>
            <div className="twk-row">
              <span>{t("tweaks.monthlyCap")}</span>
              <span className="mono" style={{ fontSize: 11 }}>${budget}</span>
            </div>
            <input
              type="range"
              min={500}
              max={6000}
              step={100}
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
