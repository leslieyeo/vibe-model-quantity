"use client";

import { CLIENTS, MODELS, PROJECTS, type Session } from "@/lib/data";
import { fmtUSD, fmtCompact } from "@/lib/format";
import { TOKEN_KIND_COLORS } from "@/components/charts";

export function SessionDrawer({ session, onClose }: { session: Session | null; onClose: () => void }) {
  if (!session) return null;
  const m = MODELS.find(x => x.id === session.model)!;
  const c = CLIENTS.find(x => x.id === session.client)!;
  const p = PROJECTS.find(x => x.id === session.project)!;
  const d = new Date(session.start);

  const tokens = [
    { id: "in",     v: session.tokens.in,     label: "Input",       price: m.prices.in    },
    { id: "cacheR", v: session.tokens.cacheR, label: "Cache read",  price: m.prices.cacheR },
    { id: "cacheW", v: session.tokens.cacheW, label: "Cache write", price: m.prices.cacheW },
    { id: "out",    v: session.tokens.out,    label: "Output",      price: m.prices.out   },
    { id: "reason", v: session.tokens.reason, label: "Reasoning",   price: m.prices.reason },
  ];
  const max = Math.max(...tokens.map(t => t.v), 1);
  const total = tokens.reduce((a, t) => a + t.v, 0);

  const transcript = [
    { who: "you", text: `Let's start on ${session.title}. The migration script is choking on the index rebuild.` },
    { who: "asst", text: "Looking at `migrations/2026_03_08_pgvector.sql`. The CREATE INDEX is running outside the transaction; pgvector's HNSW build holds a long lock." },
    { who: "you", text: "Right. Can we move it to CONCURRENTLY? What does that do to the deploy?" },
    { who: "asst", text: "CONCURRENTLY drops the table-level lock but doubles the build time. For a 4M-row table that's ≈ 6–8 minutes; the deploy window allows it." },
    { who: "you", text: "Let's do it. Also add a sanity check at the end that the index actually got created." },
  ];

  return (
    <>
      <div className="drawer-mask" onClick={onClose}></div>
      <aside className="drawer">
        <div className="d-head">
          <div className="crumb">
            <span>Session · {session.id}</span>
            <button className="close" onClick={onClose}>CLOSE ✕</button>
          </div>
          <h2>{session.title}</h2>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 11, letterSpacing: "0.06em" }}>
            {d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} · {session.durationMin}m · {session.messages} messages
          </div>
        </div>
        <div className="d-body">
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Receipt</div>
            <dl className="kv">
              <dt>Client</dt><dd>{c.name}</dd>
              <dt>Model</dt><dd>{m.display} <span style={{ color: "var(--ink-3)" }}>· {m.vendor}</span></dd>
              <dt>Project</dt><dd>{p.name} <span style={{ color: "var(--ink-3)" }}>· {p.path}</span></dd>
              <dt>Total tokens</dt><dd>{fmtCompact(total)}</dd>
              <dt>Total cost</dt>
              <dd style={{ fontFamily: "var(--font-display)", fontSize: 26, fontStyle: "italic", letterSpacing: "-0.01em" }}>
                {fmtUSD(session.cost)}
              </dd>
            </dl>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Token breakdown</div>
            <div className="token-bars">
              {tokens.map(t => (
                <div className="tb-row" key={t.id}>
                  <span className="lbl">{t.label}</span>
                  <span className="barx">
                    <span style={{ width: ((t.v / max) * 100).toFixed(1) + "%", background: TOKEN_KIND_COLORS[t.id] }}></span>
                  </span>
                  <span className="val">{fmtCompact(t.v)}</span>
                </div>
              ))}
            </div>
            <div className="mono" style={{ marginTop: 12, fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
              ${m.prices.in.toFixed(2)} in / ${m.prices.cacheR.toFixed(2)} cache-r / ${m.prices.out.toFixed(2)} out · per 1M
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Transcript preview</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {transcript.map((m2, i) => (
                <div key={i} className={`tx-bubble ${m2.who === "asst" ? "assistant" : ""}`}>
                  <span className="who">{m2.who === "asst" ? "Assistant" : "You"}</span>
                  <span>{m2.text}</span>
                </div>
              ))}
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "center", padding: "8px 0", letterSpacing: "0.14em" }}>
                — {session.messages - transcript.length} more messages —
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
