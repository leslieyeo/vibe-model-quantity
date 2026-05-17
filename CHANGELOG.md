# Changelog

All notable changes to this project documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
