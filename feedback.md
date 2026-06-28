# NEX·ERA — Build Status (2026-06-28)

*Snapshot of what exists in the repo right now, what works, and what is still a stub/mock. Written to hand to ChatGPT for next-step planning. The architecture audit that follows (below) is the research that should drive those next steps.*

**Stack:** Next.js 14.2.35 (App Router) + TypeScript + Tailwind + Framer Motion. Dev: `npm run dev` → http://localhost:3000. Auth via cookie session (admin user/pass + guest mode). Design = warm-white "Command Center" (sidebar / fluid grid / context panel).

**Providers configured in `.env.local`:** `OPENROUTER_API_KEY`, `ZENMUX_API_KEY` (LLM), `TAVILY_API_KEY` (web search/research), `AUTH_SECRET`, `ADMIN_USER/PASS`, `GUEST`. Admin can add/swap provider keys at runtime via `/admin` (persists to `.rak` disk locally, or Redis/Vercel-KV if attached).

## ✅ Working (built + functional)

| Area | Route | Notes |
|---|---|---|
| **Auth** | `/login`, `/api/auth/*` | Cookie session, admin + guest, per-role daily quotas. |
| **Command Center** | `/dashboard/home` | Post-login Mission Control landing — telemetry ribbon, quick-launch tiles, prompt box. |
| **Chat / Copilot** | `/dashboard`, `/api/chat` | Streaming LLM via OpenRouter/ZenMux with multi-provider fallback. Falls back to a grounded **stub** only if no provider is reachable. |
| **Router** | `/dashboard/router`, `/api/run` | Intent → model routing; explicit provider+model selection. |
| **AI Studio** | `/dashboard/studio` | Multi-content workspace (tabs / split / viewers / terminal). |
| **Research Hub** | `/dashboard/research`, `/api/research` | Web/PDF/YouTube/website research, cited streaming summary (Tavily + `/api/run`). |
| **Worlds** | `/dashboard/worlds` | OS container — notes/tasks/files + linked conversations/research, memory, knowledge graph. |
| **Investments** | `/dashboard/investments`, `/api/investments/*` | Live markets (Yahoo, keyless) + crypto; portfolio P/L; AI explain. |
| **Workspace / Code Folder** | `/workspace`, `/workspace/code`, `/api/workspace/*`, `/api/code/agent` | Local folder browse/edit + code agent. |
| **Finance OS (Ledger) — analytical modules** | `/ledger/*` | Real pages: analytics, commercial-intelligence, exec-pack, forecast, margin, profitability, revenue-bridge, rev-rec, statements, variance. |
| **Images** | `/dashboard/images`, `/api/generate/image` | Works **keyless** via Pollinations (free Flux). Upgrades to Together/HF if those keys added. |
| **Admin / Providers** | `/admin`, `/api/admin/*` | Add/test/sync provider + search keys at runtime. |
| **Design System** | `/design-system` | Component gallery. |

## 🟡 Partial / needs keys or input

| Area | State | To enable |
|---|---|---|
| **Video generation** | `/dashboard/videos` returns `needs-key` — no keyless provider. | Set `REPLICATE_API_TOKEN` (+ optional `REPLICATE_VIDEO_MODEL`). |
| **Image gen (premium tier)** | Runs free, but premium models off. | Set `TOGETHER_API_KEY` or `HF_TOKEN`. |
| **Finance / FP&A data** | `/dashboard/finance`, `/fpa` ship with **sample/dummy** datasets; FP&A modules marked "coming soon". | Upload real CSV/Excel; chat then prefers uploaded data. |
| **Key persistence on Vercel** | Local uses `.rak` disk; Vercel disk is read-only. | Attach Vercel KV / Upstash (`KV_REST_API_*` or `UPSTASH_REDIS_REST_*`). |

## 🔴 Not built — placeholder / mock only

| Area | State |
|---|---|
| **Agents (Automation)** | `/dashboard/agents` is a **static card grid** (hardcoded names/run counts). No real agent runtime, runs, or detail pages. **This is exactly what the audit below recommends building** (Mission Control + Agent Detail + Run Theatre). |
| **Finance OS flagship apps** | `/ledger/commission`, `/ledger/pricing`, `/ledger/commentary`, `/ledger` index render `FlagshipPlaceholder` — design-only, no logic. |
| **FP&A modules** | `/fpa` — "more coming soon". |

## Suggested next step
Per the audit below, the highest-leverage build is turning the **Agents** mock into a real agent OS: **Agent Mission Control** (running-jobs strip + fleet grid) → **Agent Detail** (5-zone page) → **Run Theatre** (live plan timeline + tool log + artifacts). Reuse Router (execution brain), Worlds (memory/knowledge/artifacts), Studio (per-agent work canvas), and the existing context-panel pattern.

---

# NEX·ERA Agent Platform — Architecture Audit & Recommendation

*Research only. No code. Goal: distill how leading agent products organize their Agent surfaces, then propose a NEX·ERA architecture that fits the existing warm-white Command Center (sidebar + fluid widget grid + contextual right panel).*

---

## 1. Landing page — what the user sees first

Two dominant patterns:

| Pattern | Products | First view |
|---|---|---|
| **Task/Run-first** (autonomous agents) | Manus, Devin, Genspark | A prompt box + a **list of tasks/sessions** (running, queued, done). The unit of work is a *run*, not an agent. |
| **Agent-list / fleet** (builder platforms) | Copilot Studio, CrewAI Studio, n8n, Replit Agents | A **grid/list of agents you own** + "New agent" + templates. The unit is an *agent you configure*. |

Distilled truths:
- The best landings lead with **live state** — what is *running right now* — not marketing cards. Manus/Devin both surface active sessions immediately.
- **Templates/marketplace** are secondary but always one click away (Genspark's tool-icon wall, Copilot's templates).
- **Activity/history** is present but demoted to a side rail or tab, never the hero.
- Nobody opens straight into a blank chat. The landing answers "what's happening + what can I start."

**Verdict for the agents landing:** running-jobs strip (top) → agent fleet grid (main) → templates + recent runs (secondary). Not a chat window.

---

## 2. Agent Detail page — sections that actually appear

Cross-product section frequency (✅ common / 🔸 some / ⚪ rare):

| Section | Seen in | Keep? |
|---|---|---|
| **Overview** (identity, status, capabilities, run button) | ✅ All | **Core** |
| **Runs / Execution** (live + past, the work itself) | ✅ Manus, Devin, Copilot monitor | **Core** |
| **Logs** (tool calls, shell, steps) | ✅ Devin, Manus | **Core** (lives inside a Run) |
| **Reasoning / Plan timeline** | ✅ Devin planner, Manus replay | **Core** (inside a Run) |
| **Tools / Capabilities** | ✅ Copilot, CrewAI, AutoGen | **Core** |
| **Knowledge** (sources, RAG) | ✅ Copilot, Claude Projects, Gemini Gems | **Core** |
| **Memory** | 🔸 Manus, CrewAI | Keep (distinct from Knowledge) |
| **Settings / Model** | ✅ All | **Core** |
| **Analytics / Performance** | ✅ Copilot monitor | Keep (per-agent slice) |
| **History** | ✅ All (= Runs over time) | Merge into Runs |
| **Artifacts / Outputs** | ✅ Manus, Genspark | **Core** |
| **Versioning** | 🔸 Copilot, builders | Keep (collapsed) |
| **Permissions** | 🔸 Enterprise (Copilot) | Keep (enterprise) |
| **Files** | 🔸 Devin, Genspark hub | Fold into Artifacts/Knowledge |
| **Conversations** | 🔸 chat-style agents | **Cut** as separate tab (Runs cover it) |
| **Topics** (dialog trees) | ⚪ Copilot only | **Cut** (that's chatbot-flow, not autonomous agents) |
| **Dependencies** | ⚪ LangGraph/dev | **Cut** from UI (internal) |

Key insight: detail pages are **not 15 flat tabs**. The good ones cluster into ~5 zones:
*Identity/Overview · Work (Runs+Logs+Artifacts) · Brain (Memory+Knowledge) · Abilities (Tools+Integrations) · Config (Settings+Versions+Permissions+Analytics)*.

---

## 3. Layout patterns

| Element | Who uses it | Note |
|---|---|---|
| **Left nav** | All | Global product nav (NEX·ERA already has this). |
| **Center workspace** | Devin, Manus, Cursor | The agent's live working surface. |
| **Right contextual panel** | Manus ("Manus's Computer"), Cursor, Copilot | **The defining feature** — streams the agent's live actions/state. NEX·ERA already built this pattern. |
| **Tabs** | Copilot Studio, CrewAI | For config-heavy detail pages. |
| **Timeline** | Devin "Follow", Manus replay | Step-by-step run playback, click-to-jump. |
| **Canvas / graph** | n8n, LangGraph, AutoGen Studio | Visual multi-step/multi-agent wiring. |
| **Chat** | All, but **as one panel**, never the whole app | Input + conversation, *beside* the work surface. |
| Accordion | Rare | Used for collapsing config groups only. |

Dominant winning layout (Manus/Devin): **left nav · center work surface · right live-action panel**, with a **run timeline** for replay. NEX·ERA's current 3-zone Command Center (sidebar / fluid main / context panel) maps onto this almost 1:1.

---

## 4. Agent containers — useful vs unnecessary

This is the crux. Verdict per container:

**KEEP (high signal, every serious platform has them):**
- **Recent Runs / Execution History** — the heartbeat. What ran, status, duration, outcome.
- **Live Execution view** — plan/steps + tool calls streaming (Manus's Computer, Devin Follow). The single biggest "this is a real agent, not a chatbot" signal.
- **Tools / Capabilities** — what the agent *can do*, with enable/disable.
- **Knowledge Sources** — RAG/docs the agent reads.
- **Artifacts / Outputs** — what it produced (files, reports, code, media), downloadable.
- **Logs** — tool I/O + errors (lives inside a run, not a top-level tab).
- **Metrics** — runs, success rate, avg duration, token/cost. A *small* tile, not a dashboard.
- **Model / Settings** — which model, temperature, system prompt, guardrails.

**OPTIONAL (valuable in context, don't lead with them):**
- **Memory** — long-term agent memory; keep separate from Knowledge.
- **Execution Queue / Upcoming Tasks** — only if scheduling/queuing exists.
- **Version History** — for agents users edit; collapse by default.
- **Permissions** — enterprise/multi-user only.
- **Integrations / API Connections** — one place, not scattered.
- **Token Usage** — a metric, not its own container; fold into Metrics.

**CUT (noise, vanity, or wrong paradigm):**
- **Conversations** as a separate top-level — Runs already capture interaction.
- **Topics / dialog trees** — that's chatbot-flow (Copilot Studio legacy), wrong for autonomous agents.
- **Dependencies** as a UI panel — internal plumbing; surface only failures.
- **Capabilities AND Tools as two things** — collapse to one.
- **Separate Files tab** — fold into Artifacts (outputs) + Knowledge (inputs).
- **Generic "Performance" dashboards per agent** if they only show vanity charts — keep one honest metrics tile.

Rule: every container must answer *"what is this agent doing / made / can do / costs"*. If it doesn't, cut it.

---

## 5. How AI OSes avoid "everything is a chat box"

The platforms that feel like operating systems (not wrappers) do five things:

1. **The run is the object, not the message.** Work is a *task with a lifecycle* (queued → planning → executing → done), addressable, replayable, shareable (Manus shareable replays). Chat is just one input method.
2. **Show the work, live.** A dedicated action stream — "Manus's Computer", Devin's shell+editor+browser, "Follow Devin" — makes the agent's process visible and clickable. Transparency = trust.
3. **Each agent gets bespoke surfaces.** A coding agent shows an editor+terminal; a research agent shows sources+citations; a finance agent shows tables+charts. Same shell, **different work canvas per agent type** — that's what makes each "its own application."
4. **Artifacts are first-class.** Outputs persist as openable objects (Genspark slides/sheets, Devin PRs), not buried in chat scrollback.
5. **Background + parallel execution.** Agents run while you do other things; the OS notifies. Not a blocking single-thread chat.

NEX·ERA already has the substrate for this: the **Router** (intent → model), **Worlds** (persistent project context), **Studio** (multi-panel work canvas), and the **context panel** pattern. The agent platform should compose these, not reinvent them.

---

## 6. Recommended NEX·ERA Agent architecture

Combined design (copying no single product), mapped onto the existing warm-white Command Center.

### Information architecture (4 routes, not 17 tabs)

```
/dashboard/agents              → Agent Mission Control (landing)
/dashboard/agents/[id]         → Agent Detail (the "app" per agent)
/dashboard/agents/[id]/builder → Agent Builder (edit/config)
/dashboard/agents/runs/[runId] → Run Theatre (live + replay)  ← shared deep view
+ /dashboard/agents?tab=marketplace | monitoring | templates
```

### A. Agents Mission Control (landing) — *reuse the dashboard widget-grid pattern*
- **Running-jobs strip** (top): live runs with status pills + progress. The heartbeat.
- **Agent Fleet grid**: agent cards (identity, status, last run, success rate, run button) — fluid auto-fit grid like the new home.
- **Templates row** + **Marketplace** entry.
- **Context panel (right):** Execution Queue + System Health + Smart suggestions ("idle agent could run X"). No chat hero.

*Why:* answers "what's running + what can I launch" instantly; matches the OS landing pattern (§1).

### B. Agent Detail — *each agent feels like its own app*
Single scrolling page with a **hero** (avatar, name, status, model, primary **Run** button) + **5 clustered zones** (tabs or anchored sections, not 15 tabs):

1. **Overview** — capabilities summary, last 3 runs, metrics tile (runs / success % / avg time / cost), connected tools at a glance.
2. **Work** — *the core.* Recent Runs list → opens **Run Theatre** (live plan timeline + tool-call log + artifacts, Manus/Devin style). Per-agent **work canvas** (editor for coding agent, sources for research, tables for finance).
3. **Brain** — Memory + Knowledge sources (add/remove docs).
4. **Abilities** — Tools/Capabilities + Integrations (one place).
5. **Config** — Model & settings, Permissions, Version history, per-agent Analytics. Collapsed/secondary.

*Why:* the 5-zone cluster (§2) avoids tab sprawl; the Run Theatre is the "not-a-chatbot" differentiator (§5).

### C. Agent Builder
- Form-first (name, instructions, model, tools, knowledge, schedule) for the 90% case.
- **Optional graph/canvas** (LangGraph/n8n-style) only for multi-step/multi-agent flows — progressive disclosure, never forced.

*Why:* most agents are simple; only power users need the graph.

### D. Marketplace + Templates
- Browse/install prebuilt agents; "fork to my fleet."

*Why:* adoption + onboarding; demoted from landing hero.

### E. Monitoring (fleet-wide)
- Cross-agent run feed, failures, queue depth, spend. Separate from per-agent Analytics.

*Why:* operators need one pane for the whole fleet (§4 Metrics, done right).

### F–Q. The remaining requested sections — where each lives & why

| Section | Lives in | Why it exists |
|---|---|---|
| **Memory** | Detail → Brain | Long-term per-agent recall; distinct from doc Knowledge. |
| **Knowledge** | Detail → Brain | RAG sources the agent reads; reuse Worlds/Research stores. |
| **Automation** | Builder + Monitoring | Triggers/workflows that launch runs. |
| **Scheduling** | Builder (config) + Queue widget | Cron/recurring runs; surfaces in Execution Queue. |
| **Analytics** | Per-agent (Detail→Config) + fleet (Monitoring) | Honest metrics only; no vanity dashboards. |
| **Templates** | Marketplace | Starting points; fork-to-edit. |
| **Execution** | Run Theatre | Live steps/tools/logs — the trust surface. |
| **History** | Runs list (= execution over time) | Not a separate tab; it's Runs filtered by date. |
| **Permissions** | Detail → Config | Enterprise/multi-user gating. |
| **Artifacts** | Detail → Work + Worlds | First-class outputs, openable/downloadable. |
| **Integrations** | Detail → Abilities | One home for connected apps/APIs. |
| **Settings** | Detail → Config | Model, prompt, guardrails. |

### What NEX·ERA should NOT include
- ❌ A chat-only agent page (route everything through Runs + work canvas, not a lone chat box).
- ❌ **Topics / dialog-tree** authoring (wrong paradigm — these are autonomous agents, not flowchart chatbots).
- ❌ Separate **Conversations**, **Files**, and **Dependencies** tabs — fold into Runs / Artifacts / (hidden) internals.
- ❌ **15 flat tabs** — cluster into the 5 zones.
- ❌ Per-agent vanity **Performance** charts — one metrics tile + fleet Monitoring is enough.
- ❌ Re-implementing Router/Worlds/Studio — **compose** them; the agent platform is an orchestration layer over what exists.

### Why this works for NEX·ERA specifically
It reuses what's already built: the **3-zone Command Center** (sidebar / fluid grid / context panel) becomes Mission Control; the **context panel** becomes the live Execution Queue; **Studio's multi-panel canvas** becomes the per-agent work surface; **Worlds** supplies Memory/Knowledge/Artifacts; the **Router** is the execution brain. Each agent gets a bespoke work canvas → feels like its own app, not a chat tab.

---

## Next step (when you want code)
The smallest high-leverage build is the **Run Theatre** (live plan timeline + tool log + artifacts) + the **Agent Detail 5-zone** page — that's what converts the current static card grid into a real agent OS.

---

## Sources
- Manus — [autonomous agent guide](https://www.baytechconsulting.com/blog/manus-ai-an-analytical-guide-to-the-autonomous-ai-agent-2025), [WorkOS: Introducing Manus](https://workos.com/blog/introducing-manus-the-general-ai-agent), [Agent Skills](https://manus.im/features/agent-skills)
- Genspark — [beginner guide](https://www.whytryai.com/p/genspark-beginner-guide), [UI breakdown](https://screensdesign.com/showcase/genspark-super-ai-agent), [review (Lindy)](https://www.lindy.ai/blog/genspark-review)
- Devin — [docs intro](https://docs.devin.ai/get-started/devin-intro), [sandbox: shell/browser/editor](https://medium.com/@nitinmatani22/devins-cloud-sandbox-explained-shell-browser-and-editor-working-as-one-6e001f8c5d3c), [inside Devin's workflow](https://easycoding.tools/blog/en/inside-devin-s-workflow-tool-use-planning-and-autonomy)
- Copilot Studio — [agents overview](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/overview), [knowledge sources](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-copilot-studio), [analytics/monitor](https://learn.microsoft.com/en-us/microsoft-copilot-studio/agents-experience/analytics-overview)
