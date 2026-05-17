# TODOS

Organized by component, then priority (P0 = bug shipping, P4 = nice-to-have).

## review (surfaced by /ship adversarial review on v0.1.0.0)

- **API caching with file mtime check**
  **Priority:** P1
  Every `/api/sessions` request re-walks `~/.claude/projects`, `~/.codex/sessions`, `~/.vibeusage/tracker` and re-parses every JSONL. ~1.3s for 166 sessions today; will keep getting slower. A `Map<filepath, { mtimeMs, parsed }>` would turn warm runs into <50ms. All three review subagents (pre-landing, Claude adversarial, Codex) flagged this.

- **Harden non-null assertions in UI**
  **Priority:** P1
  `MODELS.find(...)!`, `CLIENTS.find(...)!`, `PROJECTS.find(...)!` appear in session-row, session-drawer, and views.tsx (lines 190, 279, 327, 395, 432, 497, 500, 720). Any missing entry crashes the entire React tree. Replace with `resolveModel(id)` for models and inline fallback objects for clients/projects.

- **Stream JSONL with `readline` instead of `fs.readFile`**
  **Priority:** P1
  Current `readFile(...).split("\n")` loads whole file into memory. Mitigated by the 100/150MB size caps shipped in v0.1.0.0 but streaming would handle bigger files without RAM spikes. Use `readline.createInterface(createReadStream(file))`.

- **Codex `/compact` reset detection**
  **Priority:** P2
  Codex's `token_count` event is cumulative; we take the last one as session total. If the user runs `/compact` mid-session and Codex resets the counter, the post-reset value silently replaces the real total. Detect resets by watching for `total > previous_total`.

- **Bind `/api/sessions` to 127.0.0.1 only**
  **Priority:** P2
  Next dev listens on `0.0.0.0:3000` by default. On a public Wi-Fi anyone on the LAN can hit `/api/sessions` and read all AI usage including session titles. Add `next.config.ts` host binding or a runtime guard.

- **Real transcript ingestion in drawer**
  **Priority:** P2
  Drawer currently shows a "Transcript ingestion ships in v1.1" placeholder. Wire to actual JSONL content from the session file.

## parsers

- **`decodeCwd` hyphen handling**
  **Priority:** P2
  Claude Code encodes `cwd` by replacing `/` with `-`, so real project name `my-project` decodes to `my/project`. Currently only a fallback (real `cwd` usually arrives in event payload). Worth tightening if you ever rely on the decoded value.

- **Widen `Vendor` union**
  **Priority:** P3
  qwen / kimi / mimo are coerced into `vendor: "OpenAI"` because the `Vendor` type only has Anthropic/OpenAI/Google. Charts show their traffic as OpenAI which is misleading. Add Alibaba / Moonshot / Other.

- **Symlink defense in parser walk**
  **Priority:** P3
  `fs.stat` follows symlinks. A crafted symlink in `~/.claude/projects` could redirect reads outside the intended tree. Low real-world risk for a personal local tool but worth noting.

## ui

- **Live wall-clock in topbar**
  **Priority:** P3
  Topbar time renders once and never ticks. "Tailing logs" indicator implies live but the clock is frozen. `setInterval(1000)` + state.

- **Real file watcher for "Tailing logs"**
  **Priority:** P3
  `fs.watch` on the 3 source dirs would let the UI auto-refresh when new sessions land. Right now the dot is decoration.

- **Day-1 budget projection floor**
  **Priority:** P3
  On the 1st of a month, projected = today * daysInMonth, which can flag "OVER BUDGET" with $5 of real spend. Require 3+ days of data before showing projection.

## v2 (Leaderboard)

- **Real backend + auth + ingest API**
  **Priority:** P3
  Local payload + Tweaks opt-in already exist (hidden behind v2 flag). v2 needs Supabase/Turso + Auth.js + `POST /api/leaderboard`.

## Completed

- **v0.1.0.0 (2026-05-17)** — First ship. Six-view dashboard, real data from Claude Code + Codex + Hermes, three themes, en/zh i18n.
