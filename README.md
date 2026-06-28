# NEX·ERA — AI Operating System

A full AI workspace (`rak-os`) — not a landing page. A cinematic landing boots into a multi-app OS: chat copilot, model router, research, AI studio, investments, finance modules, local workspace/code editing, and media generation. Design language is the warm-white **Command Center** (sidebar / fluid widget grid / contextual right panel).

> For a detailed, current build status (what works / what's stubbed) and the agent-platform architecture audit, see [`feedback.md`](./feedback.md).

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Framer Motion
- Cookie-session auth (admin + guest), per-role daily quotas
- LLM via OpenRouter / ZenMux with multi-provider fallback; web research via Tavily

## Run
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # vitest
```

## Configuration
Set keys in `.env.local`:

| Var | Purpose | Required |
|---|---|---|
| `OPENROUTER_API_KEY`, `ZENMUX_API_KEY` | LLM providers (chat, router, research) | yes (≥1) |
| `TAVILY_API_KEY` | Web search / research | yes for Research |
| `AUTH_SECRET`, `ADMIN_USER`, `ADMIN_PASS`, `GUEST` | Auth / session | yes |
| `TOGETHER_API_KEY` or `HF_TOKEN` | Premium image gen (else free Pollinations) | optional |
| `REPLICATE_API_TOKEN`, `REPLICATE_VIDEO_MODEL` | Text-to-video (no keyless fallback) | optional |
| `KV_REST_API_URL`/`_TOKEN` or `UPSTASH_REDIS_REST_URL`/`_TOKEN` | Persist runtime keys on Vercel (read-only disk) | optional |

Admin can add/swap provider keys at runtime from `/admin` (persists to `.rak` disk locally, or Redis/KV if attached).

## Surfaces
- **Landing** (`/`) — cinematic AI-core landing; boots into the OS.
- **Command Center** (`/dashboard/home`) — post-login Mission Control: telemetry ribbon, quick-launch tiles, prompt box.
- **Chat / Copilot** (`/dashboard`) — streaming LLM with provider fallback.
- **Router** (`/dashboard/router`) — intent → model routing; explicit provider+model select.
- **AI Studio** (`/dashboard/studio`) — multi-content workspace (tabs / split / viewers / terminal).
- **Research** (`/dashboard/research`) — web/PDF/YouTube/website, cited streaming summaries.
- **Worlds** (`/dashboard/worlds`) — OS container: notes/tasks/files + linked conversations/research, memory, knowledge graph.
- **Investments** (`/dashboard/investments`) — live markets (Yahoo, keyless) + crypto, portfolio P/L, AI explain.
- **Workspace / Code** (`/workspace`, `/workspace/code`) — local folder browse/edit + code agent.
- **Finance OS** (`/ledger/*`) — analytical modules (analytics, forecast, margin, variance, profitability, statements, …).
- **Images / Videos** (`/dashboard/images`, `/dashboard/videos`) — keyless image gen; video needs a Replicate key.
- **Admin / Settings** (`/admin`, `/dashboard/settings`), **Design System** (`/design-system`).

## Theme
Warm-white "Command Center" — orange/cream palette, glass surfaces, neon HUD accents. Shared kit in `components/uikit` + `components/ds`; design tokens in `tailwind.config.ts` and `app/globals.css`. Global motion (cursor glow, ambient orbs, page transitions, count-up) in `components/fx`.
