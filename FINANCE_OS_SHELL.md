# NEX·ERA Finance OS — Shared Shell (Product Design)

> **Design only. No code.** One operating-system shell wraps all five Finance apps. **Apps change only the center workspace** — everything else (nav, context panel, upload, export, AI, activity, history, notifications, approvals, versions, breadcrumbs, shortcuts) is inherited from the shell. Feel: **Figma · Power BI · Cursor · Notion**, in the warm-white DS.

---

## 0. The contract

> The shell is a frame with one swappable slot. An application supplies **a workspace + a little metadata**; it inherits the entire operating system around it.

**An app provides (slots):**
- `workspace` — the bespoke canvas (the only large surface that changes).
- `tabs` — its screen sub-nav (e.g. Commission: Plans/Runs/Payees…).
- `breadcrumb` — segments for the path.
- `primaryActions` — 1–2 top-bar verbs (e.g. *Run calc*, *Generate*).
- `copilotContext` — grounding for the AI panel (reuse `lib/fpa/context.ts`).
- `records` — typed feed for Activity / History / Versions / Approvals so the shell renders them generically.
- `exporters` — which export formats apply.

**Everything else is inherited and identical across all five apps.**

---

## 1. Layout regions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR                                                                        │
│ ☰  Finance OS › Commission Studio › Q2 Plan › Runs     ⌘K Search   ⬆Upload  ⤓Export │
│                                          ◷ Temporary   ● In Review   🔔3   ⟳   ◍RP │
├──────┬──────────────────────────────────────────────────────┬──────────────────┤
│ LEFT │  APP SUB-NAV (tabs)   Plans · Runs · Payees · Quotas… │  CONTEXT PANEL    │
│ RAIL ├──────────────────────────────────────────────────────┤  ┌──────────────┐ │
│      │                                                       │  │ AI · Activity │ │
│ ◧ Exec│                                                       │  │ History · Ver │ │
│ ◧ Comm│              ███  WORKSPACE  (app-owned)  ███          │  │ Approvals · 🔔 │ │
│ ◧ BI  │              the only slot that changes               │  └──────────────┘ │
│ ◧ Price│                                                      │  Finance Copilot  │
│ ◧ Var │                                                       │  + contextual     │
│ ◧ Comm.│                                                      │  tabs (inherited) │
│ ─────│                                                       │                   │
│ Recent│                                                       │                   │
├──────┴──────────────────────────────────────────────────────┴──────────────────┤
│ STATUS BAR  ◷ Temporary · cleared on close   ✓ Saved 2m ago   ⚙ Calc idle   ⌘K  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

Regions: **Top bar** · **Left rail** (Finance OS app switcher + recent, collapsible) · **App sub-nav** · **Workspace slot** (app) · **Right context panel** (tabbed) · **Status bar** · **Overlays** (command palette, upload, export, notifications).

---

## 2. Inherited elements → region · behavior · reused infra

| Element | Region | Behavior | Reuse |
|---|---|---|---|
| **Top navigation** | Top bar + Left rail + App sub-nav | Left rail = switch between the 5 apps; sub-nav = the app's screens; top bar = global actions | `FpaShell`/`ModuleNav` (rebranded) |
| **Context panel** | Right, **tabbed** | Tabs: **AI · Activity · History · Versions · Approvals · Notifications · Recent**. Collapsible. App fills "AI context"; rest is generic | Command-Center context-panel pattern + `RightPanel` |
| **Upload framework** | Top-bar `⬆Upload` + global drag-drop | Opens with **Analyze-Only ⭐ / Save / Download** bar; column-map step | `ingest` · `mapping` · `FileDrop` · `UploadMapper` · `ColumnMapper` |
| **Recent files** | Left rail "Recent" + Context→Recent tab + ⌘K | Cross-app recent datasets/projects; click to resume | IndexedDB `db.ts` + Worlds |
| **Temporary workspace** | Top-bar `◷ Temporary` badge + Status bar | Persistent "Temporary · cleared on close" indicator; "Save workspace" promotes it to durable | Privacy framework / session TTL |
| **Export** | Top-bar `⤓Export` menu | Excel · CSV · PDF · **PPTX** · (Power BI assets in BI Studio) | `export.ts` · `ExportMenu` · `gen/generate` |
| **AI Assistant** | Context → **AI** (primary tab) | Finance Copilot: explains screen, drafts, answers, **cites**; per-app grounding; routes via Router | `lib/fpa/context.ts` · NEX·ERA Router |
| **Activity** | Context → Activity | Event stream for the current project (this session's actions) | `audit` events (live) |
| **History** | Context → History | Past runs/sessions over time; re-open | `db.ts` run log |
| **Notifications** | Top-bar `🔔` + popover | Approvals needed, material variances, calc done, alerts; badge count | Notification service |
| **Approval status** | Top-bar pill (`Draft / In Review / Approved`) + Context → Approvals | Submit→review→approve; threshold auto-approve; queue | Approval Engine (Commission+Pricing) |
| **Version history** | Context → Versions | Immutable snapshots; compare; restore | `scenario` snapshots + `db.ts` + `audit` |
| **Breadcrumbs** | Top-bar left | `Finance OS › App › Project › Screen`, each segment clickable (Notion-style) | shell |
| **Keyboard shortcuts** | Command palette `⌘K` + `?` overlay | Nav, actions, AI, upload, export, switch app — all keyboard-driven | command registry |

---

## 3. Top bar (anatomy, left → right)
`☰` rail toggle · **Breadcrumbs** · **⌘K Search/Command** · **⬆ Upload** · **⤓ Export** · `◷ Temporary` badge · **Approval pill** · **🔔 Notifications** · `⟳` save/sync state · **App primary action(s)** (e.g. *Run calc*) · **avatar/presence**.

## 4. Context panel (right, tabbed — the inherited "second brain")
Default tab = **AI** (Finance Copilot). Tabs are inherited; their *content* is app-typed via `records`/`copilotContext`:
- **AI** — copilot chat + suggested actions + cited sources (per-app grounding).
- **Activity** — live event stream (this session).
- **History** — prior runs/sessions, re-open.
- **Versions** — snapshots, diff, restore.
- **Approvals** — status, queue, submit/approve.
- **Notifications** — alerts for this project.
- **Recent** — recent files/datasets/projects.
Collapsible to an icon rail (Cursor/Figma).

## 5. Command palette (`⌘K`) — the Notion/Cursor spine
One palette = **navigate** (jump app/screen/project) + **act** (Run calc, Generate, Upload, Export, Save) + **ask AI** (NL → copilot). Fuzzy search across files, actions, screens.

## 6. Status bar (bottom)
`◷ Temporary · cleared on close` · `✓ Saved 2m ago` / `Unsaved` · `⚙ Calc idle/running` · audit-on indicator · presence · `⌘K` hint.

---

## 7. Keyboard shortcuts (inherited)
| Key | Action |
|---|---|
| `⌘K` | Command palette / search |
| `⌘\` | Toggle context panel |
| `⌘B` | Toggle left rail |
| `⌘U` | Upload |
| `⌘E` | Export |
| `⌘S` | Save workspace (promote from Temporary) |
| `⌘↵` | Run app primary action (calc / generate) |
| `G then 1…5` | Jump to app (Commission…Commentary) |
| `?` | Shortcut cheatsheet overlay |

---

## 8. Reference-feel mapping
| Source | Borrowed idea | In the shell |
|---|---|---|
| **Figma** | Top toolbar + right properties + presence + share | Top bar actions, tabbed context panel, presence/avatar |
| **Power BI** | Ribbon actions + side panes + report canvas + filters | Top-bar actions, context tabs, workspace canvas, filter context |
| **Cursor** | `⌘K` everywhere + collapsible AI panel + agent status | Command palette, AI tab, status bar run state |
| **Notion** | Breadcrumbs + slash/command + clean collapsible sidebar + version history + sharing | Breadcrumbs, palette, left rail, Versions tab |

---

## 9. Responsive
- **≥1280:** full — left rail + workspace + context panel.
- **1024–1279:** context panel collapses to icon rail (expand on demand); left rail collapsible.
- **<1024:** left rail → drawer; context panel → bottom sheet / toggle; top bar condenses (overflow menu).
- Workspace is always the priority surface; chrome yields first.

---

## 10. Design guarantees
- **Apps only change the workspace.** Top bar, context panel, upload, export, AI, activity, history, notifications, approvals, versions, breadcrumbs, shortcuts are byte-identical across all five → one OS.
- **Temporary by default** is always visible (badge + status bar) — privacy is a first-class shell affordance, not buried.
- **One copilot, one upload, one export, one audit** — shared services, app-typed content.
- Built on the **kept Ledger infra** (FpaShell, context-panel pattern, ingest/export/audit/scenario/db, Router) — rebrand + recompose, not rewrite.

> One-liner: **Finance OS = a fixed operating-system frame with a single swappable workspace slot.** Learn it once; every app feels the same except the canvas.
