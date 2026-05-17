"use client";

import { CLIENTS, MODELS, PROJECTS, type Session } from "@/lib/data";
import { fmtUSD, fmtCompact } from "@/lib/format";
import { vendorLetter } from "@/components/charts";

export function SessionRow({ session, onClick }: { session: Session; onClick?: () => void }) {
  const m = MODELS.find(x => x.id === session.model)!;
  const c = CLIENTS.find(x => x.id === session.client)!;
  const p = PROJECTS.find(x => x.id === session.project)!;
  const date = new Date(session.start);
  const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const day = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const totalTokens = session.tokens.in + session.tokens.cacheR + session.tokens.cacheW + session.tokens.out + session.tokens.reason;

  return (
    <div className="session-row" onClick={onClick}>
      <div className="time">
        <div>{time}</div>
        <div style={{ color: "var(--ink-4)", marginTop: 2 }}>{day}</div>
      </div>
      <div>
        <div className="s-title">{session.title}</div>
        <div className="meta">
          <span>{p.name}</span><span>·</span><span>{c.name}</span><span>·</span><span>{m.display}</span>
        </div>
      </div>
      <div className="tokens">
        <div>{fmtCompact(totalTokens)} tok</div>
        <div style={{ color: "var(--ink-4)" }}>{session.messages} msgs · {session.durationMin}m</div>
      </div>
      <div className="tokens">
        <span className={`pill vendor-${vendorLetter(m.vendor)}`} style={{ marginRight: 6 }}>{m.vendor[0]}</span>
        <span style={{ color: "var(--ink-3)" }}>{m.display.split(" ")[0]}</span>
      </div>
      <div className="cost">{fmtUSD(session.cost)}</div>
    </div>
  );
}
