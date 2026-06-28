# NEX·ERA Ledger → Finance OS — Migration Roadmap

> **Roadmap only. No code.** Consolidated execution view. Detail lives in `FINANCE_OS_{MIGRATION,ARCHITECTURE,APPS_DESIGN,SHELL,PRIVACY}.md`.
> Target: NEXERA Ledger → **Finance OS** (5 flagships + Executive Dashboard), **in place** at `/ledger`. Reuse infra, replace product modules.

---

## 1. Components — KEEP / RENAME / DELETE

### ✅ KEEP (infrastructure — unchanged)
| Group | Files |
|---|---|
| **Shell / upload / export** | `finance-os/{Shell,ModuleScreen,WorkspaceBar,FileDrop,UploadMapper,ColumnMapper,ExportMenu,ExceptionPanel}` |
| **Shared widgets** | `finance-os/dashboard/{Charts,DataGrid,FilterContext,Filters,HeatMap,KpiCard,RankingTable}` |
| **System** | `finance-os/system/{Modal,theme,toast}` |
| **Nav chrome** | `fpa/{FpaShell,ModuleNav,TopBar}` |
| **Renderer** | `fpa/ModuleView` *(KEEP but rewire — drops the 4 client `*Tool`s)* |

### ✏️ RENAME / REBRAND (kept components, product logic modernized into flagships)
| Now | Becomes |
|---|---|
| `finance-os/commission/{CommissionHub,PlanStudio,RunPanel,Statements,Dashboards}` | **Commission Studio** |
| `finance-os/variance/VarianceExplorer` | **Variance Studio** |
| `finance-os/margin/MarginAnalysis` + `finance-os/deal-desk/{DealDesk,Dashboards}` | **Pricing Studio** |
| `fpa/FpaShell` (+ `finance-os/Shell`) | **Finance OS shell** (rebrand "Ledger"→"Finance OS") |
| *(BI Studio, Commentary AI = new screens built on KEEP infra — not renames)* | |

### ❌ DELETE
| Delete | After |
|---|---|
| `finance-os/ci/**` (incl `ci/modules/*`, `ci/modules/ui.tsx`) + `lib/finance-os/ci/**` | relocate `tavily`+`search-key` first |
| `finance-os/{forecast,revenue-bridge,profitability,rev-rec,statement-factory,exec-pack}/` + `lib/finance-os/{revrec,profitability}.ts` | registry trimmed |
| `components/finance/{CommissionTool,MarginTool,VarianceTool,ForecastTool}.tsx` | ModuleView rewired |

---

## 2. Routes to migrate

| Before | After | Action |
|---|---|---|
| `/ledger` | **Finance OS — Executive Dashboard** | rebuild landing (5 tiles + KPIs + alerts + recent) |
| `/ledger/commission` | **Commission Studio** | KEEP, deepen |
| `/ledger/variance` | **Variance Studio** | KEEP, deepen |
| `/ledger/margin` | → `/ledger/pricing` | fold into **Pricing Studio** |
| *(new)* | `/ledger/pricing`, `/ledger/bi`, `/ledger/commentary` | stand up |
| `/ledger/{forecast,revenue-bridge,profitability,rev-rec,statements,exec-pack,commercial-intelligence}` | removed | redirect → `/ledger` |
| `/fpa/*` (FPA shell + `[module]`) | consolidate into `/ledger` | trim registry; `/fpa` → redirect/alias |
| `/dashboard/finance` (calculators) | retired | redirect → `/ledger` |

---

## 3. Stores to reuse
| Store | Disposition |
|---|---|
| `lib/finance-os/db.ts` (**IndexedDB** — templates, plans, explicit saves) | ✅ REUSE (the local-first persistence) |
| `lib/finance-os/{audit,scenario,validate}.ts` (state engines) | ✅ REUSE |
| `finance-os/dashboard/FilterContext`, `system/{theme,toast}` | ✅ REUSE |
| `components/worlds/store` (projects-as-Worlds) | ✅ REUSE (saved Finance projects) |
| `components/dashboard/store` (`useDashboard`) | ✅ REUSE (shell-level state) |
| `lib/fpa/dataStore.ts` (**global server JSON file**) | 🔧 MODERNIZE → per-session TTL (Upstash) or drop for `db.ts` |

---

## 4. APIs to reuse
| API | Disposition |
|---|---|
| `/api/extract` (upload→text, stateless) | ✅ REUSE (upload parse) |
| `/api/run`, `/api/finance-os/ai` | ✅ REUSE (Finance Copilot) |
| `/api/models`, `/api/admin/providers/*` | ✅ REUSE (Router / providers) |
| `/api/auth/*` | ✅ REUSE (session) |
| `/api/admin/ci-search-key` | ✏️ RENAME → `web-search-key`, KEEP (web-search key; Research uses Tavily) |
| `/api/fpa/data` | 🔧 MODERNIZE (per-session TTL) |
| `/api/ci/{competitor-discovery,competitor-news,competitor-research}` | ❌ DELETE (with CI) |

---

## 5. Subsystem reuse (explicit)
- **Upload system:** `ingest` + `mapping` + `FileDrop`/`UploadMapper`/`ColumnMapper` + `/api/extract` → REUSE as-is; only **add** the Analyze-Only/Save/Download bar.
- **Export:** `export.ts` (xlsx/jspdf/csv) + `ExportMenu` + `gen/generate` → REUSE; only **add PPTX**.
- **Temporary data:** local-first `db.ts` IndexedDB (explicit-save only) → REUSE; replace the global server file (`dataStore`) with session-TTL → the only privacy fix.

---

## 6. Safest migration order (each step keeps the app green; deletes are LAST)

```
0. Branch `finance-os-migration` (rollback safety).
1. RELOCATE  tavily.ts + search-key.ts  ci/agent → lib/web/ ; repoint /api/research + admin route.
              → unblocks CI deletion; app still compiles.
2. HIDE      Trim registries (lib/fpa/modules.ts + lib/finance-os/modules.ts) → 5 flagships.
              → obsolete modules vanish from nav; old code still present but unreachable.
3. REBRAND   Shell "Ledger" → "Finance OS" (labels/titles only). Cosmetic, safe.
4. BUILD     Stand up new routes: /ledger (Exec Dashboard), /ledger/pricing (margin+deal-desk),
              /ledger/bi, /ledger/commentary. Rewire ModuleView off the *Tools.
              Commission + Variance untouched.
5. SWAP      Privacy: dataStore → session-TTL; add Analyze-Only upload bar; add PPTX export.
6. DELETE    Now-unreachable code: ci/**, forecast/revenue-bridge/profitability/rev-rec/
              statement-factory/exec-pack, /api/ci/*, client *Tools, /dashboard/finance (→redirect).
7. CLEANUP   Dead registry/sample/type entries; (optional) converge finance-os UI onto uikit.
8. VERIFY    npx tsc --noEmit ; npm run build ; screenshots (desktop+mobile) ; grep dangling imports/routes.
```

**Why this order is safe:**
- **Relocate before delete** (step 1) — the only cross-product dependency (Research→Tavily) is moved first, so deleting CI can't break Research.
- **Hide before delete** (step 2) — trimming the registry removes modules from the UI while the code still compiles; nothing 404-crashes.
- **Build new before deleting old** (steps 4 → 6) — the five apps exist and work before any removal; rollback is trivial at every step.
- **One privacy swap** (step 5) isolated and reversible.
- **Deletes dead last** (step 6) — only code already unreachable from nav + with deps relocated.
- **Verify gate** (step 8) — tsc + build + visual, plus a dangling-import grep.

---

## 7. Risk register
| Risk | Mitigation |
|---|---|
| CI delete breaks Research (Tavily) | Step 1 relocate (proven by Phase-1 grep) |
| FPA `[module]` route crashes on removed slug | Step 2 registry trim before any delete |
| Privacy leak persists | Step 5 dataStore→session-TTL is part of migration, not after |
| Two design systems drift (finance-os vs uikit) | Step 7 optional convergence |
| Dangling imports after delete | Step 8 grep gate |

> Bottom line: **relocate → hide → rebrand → build new → swap privacy → delete old → verify.** Infra reused throughout; only product modules change; rollback-safe at every step.
