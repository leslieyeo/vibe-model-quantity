# vibeModelQuantity

A local, single-user dashboard for tracking your AI coding token usage across Claude Code, Codex, and Hermes.

## What it does

Reads conversation logs from disk, aggregates by day / model / client / project, and surfaces cost. No cloud, no login, no upload — everything happens on `localhost`.

Right now it shows:

- **$ spent** — today / 7d / MTD / 30d / 60d
- **Token mix** — input / cached / output / reasoning, with cache-hit rate
- **By model** — Opus, Sonnet, GPT-5, Qwen, Kimi, etc, with treemap and per-model sparklines
- **By client** — Claude Code, Codex CLI, Hermes (and stubs for Gemini CLI / OpenClaw)
- **By project** — inferred from `cwd` at session time
- **Sessions** — every conversation, drill into a receipt-style drawer
- **Budget** — monthly cap, burn rate, on-pace projection

Three themes: paper (Hermès cream), ink (dark warm), terminal (CRT amber). en / zh i18n.

## Data sources

| Client | Source | Status |
|---|---|---|
| Claude Code | `~/.claude/projects/*/<session>.jsonl` | Real |
| Codex CLI | `~/.codex/sessions/<Y>/<M>/<D>/rollout-*.jsonl` + `archived_sessions/` | Real |
| Hermes | `~/.vibeusage/tracker/hermes.usage.jsonl` (needs vibeusage plugin) | Real |
| Gemini CLI | n/a | Stub — Gemini CLI doesn't persist token usage to disk |
| OpenClaw | n/a | Stub — install-detection only |

## Run it locally

```bash
git clone https://github.com/leslieyeo/vibe-model-quantity.git
cd vibe-model-quantity
npm install
npm run dev
# Open http://localhost:3000
```

First load takes ~1.3s while it walks your local AI client directories. Refreshes re-parse — see TODOS.md for the v1.1 caching plan.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind 4
- next-intl (en / zh)
- Charts: raw SVG, no chart library
- Fonts: Instrument Serif + Geist + Geist Mono (via `next/font`)

## Status

v0.1.0.0 — first ship. See [CHANGELOG.md](./CHANGELOG.md) for what's in / [TODOS.md](./TODOS.md) for what's next.

Manually QA'd against real disk data; no automated tests in v1 (see `.gstack/no-test-bootstrap`).

## License

Private.
