# Changelog


## [0.1.4.0] - 2026-05-17

### Changed

- **All $ now visibly labelled "at retail API rates / 按官方 API 计价"** so no one mistakes shadow-API-value for actual subscription bill.
  - Big H1 headline on Overview + Budget gets a bordered tag underneath.
  - Head-stat eyebrows ("Daily average", "Models touched", "Active clients", "Projects touched", "In range") suffixed with "· API".
  - KPI "SPEND · API" label same treatment.
- Triggered by comparing with vibeusage's $327 vs our $940 on identical token data — the gap is purely pricing-table (their OpenRouter live sync vs our Anthropic public Opus 4 rates) and we want users to know which rate they're seeing.

All notable changes to this project documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.3.0] - 2026-05-17

### Changed

- **Hermes session titles include session_id suffix.** Was `hermes · discord` for every Discord session — same string repeated dozens of times in the Sessions list. Now `discord · 9fbd0971`, so each row is visually distinguishable at a glance.

### Notes

`/design-review` audit complete (see `~/.gstack/projects/leslieyeo-vibe-model-quantity/designs/`). Desktop verdict: clean App UI, no AI slop, Trunk Test 5/6, Litmus 7/7. Mobile responsiveness deferred to v1.x as a separate feature (logged in TODOS.md).

## [0.1.2.0] - 2026-05-17

### Changed

- **Cost methodology disclosure.** Added a clearly-labelled note under the Overview headline: dollar values are *retail API prices applied to token counts*, not money you actually paid. Most users are on flat-rate Claude/ChatGPT subscriptions where these numbers are off by 50-100×. Treating $ as "shadow API value" is now explicit.
- **Replaced "Avg session" KPI with "Top model".** "$ per session" was a confusing ratio. "Top model" surfaces a concrete decision-useful fact ("Opus 4.7 took 70% of your spend") — name + dollar amount + share-of-total.

## [0.1.1.0] - 2026-05-17

### Fixed

- **Codex cost double-counted cached tokens.** OpenAI's `token_count.info.total_token_usage.input_tokens` already includes `cached_input_tokens`; we were billing the cached portion at both full input price and cache-read price. Codex CLI totals were ~58% too high (e.g. $1,425 → $599 for MTD on a real ledger). Fix: subtract `cached_input_tokens` from `input_tokens` in the parser so cost math stays additive.
- **Hermes cost same bug for OpenAI-compatible providers** (Qwen via DashScope, MiMo via Xiaomi). Anthropic provider records remain disjoint; other providers now subtract cached input.

### Changed

- **Dropped redundant "Burn rate" KPI.** It was identical to "Daily average" in the head-stat. Replaced with **Avg session** ($ per session) — actionable signal that scales naturally as you switch ranges.
- **Cache hit subtitle clarity.** Was "saved ≈ $X" (which felt static because it grew slowly across ranges and the framing was abstract). Now shows "X cached" — absolute token count, which moves visibly with range.
- **Tokens subtitle.** Was "X out". Now shows both "in X · out X" so you can see the input/output split at a glance.
- **Dropped "$X / work-hr" sub-metric** — derived from an 8h/day assumption that wasn't surfaced. Useless without context.
- **i18n** — "Burn rate / 燃烧速率" → "Daily spend / 日均花费" (Budget view head-stat).

## [0.1.0.0] - 2026-05-17

First public ship. Local AI coding token usage dashboard with real-data ingestion from Claude Code, Codex, and Hermes.

### Added

- Six-view dashboard: Overview, Models, Clients, Projects, Sessions, Budget.
- Real data ingestion:
  - **Claude Code** — walks `~/.claude/projects/*/*.jsonl`, attributes tokens per local calendar day so long-running conversations spanning multiple days no longer dump all their cost on the first day.
  - **Codex** — walks `~/.codex/sessions/<Y>/<M>/<D>/rollout-*.jsonl` plus `archived_sessions/`, reads cumulative `token_count` events.
  - **Hermes** — reads `~/.vibeusage/tracker/hermes.usage.jsonl` (requires the vibeusage Hermes plugin) and groups by `session_id × local day`.
  - **Gemini CLI** — installed-state stub; Gemini CLI doesn't persist token usage to disk.
  - **OpenClaw** — install-detected stub.
- Editorial × terminal design system:
  - Three themes: paper (Hermès cream), ink (dark warm), terminal (CRT amber).
  - Four accent colors and three density steps.
  - Instrument Serif headlines, Geist UI, Geist Mono data.
- Bilingual UI (en / zh) via next-intl with localStorage persistence. Mono UI labels stay English to keep the terminal aesthetic; prose and headlines translate.
- Six chart primitives implemented in raw SVG: Sparkline, StackedBarChart, LineChart, HourHeatmap, Treemap (squarified), Donut.
- Session drawer with token-bucket bars and receipt-style metadata.
- `/api/sessions` Node-runtime route handler that parses on demand and returns merged sessions, discovered models, projects, and per-client diagnostics.
- Tweaks floating panel for theme / accent / density / locale / monthly-budget controls.

### Fixed

- Day-key now uses local timezone instead of UTC ISO; post-midnight sessions no longer fall into the previous day.
- `NOW` no longer anchors to the latest session timestamp; topbar shows real wall-clock time.

### Defended against

- Files larger than 100MB (Claude) / 150MB (Codex) skipped to keep the API route from OOMing on rogue rollouts.
- `/api/sessions` wraps `ingestAll()` in try/catch and surfaces parser failures as a diagnostic instead of hanging the UI.

### Known limitations

- No file-mtime cache: every `/api/sessions` GET re-parses everything (~1.3s for 166 sessions). On the v1.1 list.
- Several `Array.find(...)!` non-null assertions in UI components will crash the React tree on an unknown model / client / project. Currently safe because parsers and API always populate the rosters they emit, but should be hardened. On the v1.1 list.
- Tests opt-out via `.gstack/no-test-bootstrap`; v1 validated manually against real disk data.
- Leaderboard scaffolding (`src/lib/leaderboard.ts`, `src/components/leaderboard-view.tsx`) ships but is hidden by a v2 feature flag in `app-shell.tsx`.

[0.1.0.0]: https://github.com/leslieyeo/vibe-model-quantity/releases/tag/v0.1.0.0
