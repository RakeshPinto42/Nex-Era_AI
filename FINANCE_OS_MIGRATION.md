# NEX·ERA Ledger → Finance OS — Migration Plan

> **Plan only. No code.** Finance OS *replaces* NEXERA Ledger in place. It is **not a new app** — it inherits Ledger's infrastructure (upload, local-first processing, temp-data, export, navigation, privacy, design system, session handling). We **replace the product architecture** (module set), not the working plumbing. Obsolete modules are deleted; no backwards compatibility for them.

Target architecture = the five flagships + Executive Dashboard from `FINANCE_OS_ARCHITECTURE.md`:
**Commission Studio · BI Studio · Pricing Studio · Variance Studio · Commentary AI**.

---

## 1. Inventory → disposition (every existing piece)

### A. Modules (routes `app/ledger/*` + `components/finance-os/*`)

| Existing module | Route | Disposition | Folds into / Why |
|---|---|---|---|
| **Commission** | `/ledger/commission` | ✅ **KEEP → Commission Studio** | Core flagship. Reuse `lib/finance-os/commission/{engine,types}.ts`, `components/finance-os/commission/*`. |
| **Variance** | `/ledger/variance` | ✅ **KEEP → Variance Studio** | Core flagship. Reuse `components/finance-os/variance/*` + `lib/finance-os/bridge.ts` (waterfall). |
| **Margin** | `/ledger/margin` | 🔀 **FOLD → Pricing Studio** | Margin analysis = a Pricing screen. Reuse `lib/finance-os/pricing.ts`, `components/finance-os/margin/*`. Route retires; capability moves to `/ledger/pricing`. |
| **Deal Desk** | (component) | 🔀 **FOLD → Pricing Studio** | Deal/price approval workflow. Reuse `lib/finance-os/{dealdesk,scenario}.ts`, `components/finance-os/deal-desk/*`. |
| **Forecast** | `/ledger/forecast` | ❌ **DELETE (standalone)** | Listed for removal. Forecast becomes an **input file** to Variance Studio, not its own module. |
| **Revenue Bridge** | `/ledger/revenue-bridge` | ❌ **DELETE (standalone)** | Listed. The bridge/waterfall *capability* lives in Variance Studio (via `bridge.ts`); the standalone module goes. |
| **Customer Profitability** | `/ledger/profitability` | ❌ **DELETE** | Listed. Not one of the five. |
| **Revenue Recognition Validator** | `/ledger/rev-rec` | ❌ **DELETE** | Listed. Accounting-adjacent → anti-scope ("not accounting software"). |
| **Sales Statement Factory** | `/ledger/statements` | ❌ **DELETE (standalone)** | Listed. Commission statements live **inside Commission Studio**; generic factory goes. |
| **Executive Pack Generator** | `/ledger/exec-pack` | ❌ **DELETE (standalone)** | Listed. Exec decks/narrative → **Commentary AI**; reuse its deck/export bits, retire the module. |
| **Commercial Intelligence (CI)** | `/ledger/commercial-intelligence` | ❌ **DELETE (entire tree)** | Listed. Market/competitor/web-research intelligence — not a finance flagship; anti-scope. Whole `ci/*` lib + components + Tavily agent removed from Finance OS. |

### B. New flagship surfaces (no 1:1 existing module — build on reused infra)

| New app | Route | Built from reused infra |
|---|---|---|
| **BI Studio** | `/ledger/bi` | `lib/finance-os/{ingest,mapping}.ts` + `components/finance-os/{UploadMapper,ColumnMapper,FileDrop}` + client parse (`components/finance/shared.tsx`) + export engine. |
| **Commentary AI** | `/ledger/commentary` | `lib/finance-os/ai.ts` + `lib/gen/generate.ts` + export (PPT/Word) + salvage exec-pack deck templates before deleting. |
| **Executive Dashboard** | `/ledger` (landing) | Rebuilt landing: 5 launch tiles + Finance KPIs + AI Alerts + Recent Projects/Reports (reuse home widget-grid + context-panel pattern). |

### C. Client "calculator" tools (`components/finance/*`, page `/dashboard/finance`)

| Piece | Disposition |
|---|---|
| `CommissionTool`, `MarginTool`, `VarianceTool`, `ForecastTool` | ❌ **DELETE as standalone calculators** (brief: "no calculators"). Salvage any client-parse/calc helpers into the matching flagship, then remove the tool UIs. |
| `components/finance/shared.tsx` (client CSV parse, dropzone) | ♻️ **REUSE** as local-first parse for BI/Pricing/Variance ingest. |
| `app/dashboard/finance/page.tsx` (calculator hub) | ❌ **RETIRE** → redirect to `/ledger` (Finance OS). Update sidebar. |
| `components/finance/SampleData.tsx` | ♻️ Keep (demo data generator) or fold into `lib/finance-os/samples.ts`. |

### D. Infrastructure — **REUSE, do NOT rewrite**

| Capability | Keep |
|---|---|
| **Upload framework** | `components/finance-os/{FileDrop,UploadMapper,ColumnMapper}.tsx`, `lib/finance-os/{ingest,mapping}.ts`, `/api/extract` (stateless), `/api/fpa/data` |
| **Local-first processing** | `components/finance/shared.tsx` client parse; browser-side compute |
| **Temporary-data mechanism** | `lib/fpa/dataStore.ts` + `/api/fpa/data` — **but** migrate to per-session TTL store (per `FINANCE_OS_PRIVACY.md`; fixes the global-file leak) |
| **Export engine** | `lib/finance-os/export.ts`, `components/finance-os/ExportMenu.tsx`, `lib/gen/generate.ts` |
| **Navigation / shell** | `components/fpa/{FpaShell,ModuleNav,TopBar,ModuleView}`, `components/finance-os/{Shell,ModuleScreen,WorkspaceBar}`, `app/ledger/layout.tsx`, `app/fpa/layout.tsx` |
| **Privacy architecture** | Warm theme + the upload privacy framework (Analyze-Only default) |
| **Design system** | warm-white DS / `components/uikit` |
| **Session handling** | `lib/auth/session.ts` (`SESSION_COOKIE`) |
| **Shared finance engines** | `lib/finance-os/{audit,scenario,validate,db,identity,modules,types,samples,ai,bridge,pricing,commission/*}.ts` |
| **Module registry** | `lib/fpa/modules.ts`, `lib/finance-os/modules.ts` — **edit** to list only the 5 flagships |

---

## 2. Concrete DELETE list (after dependency check)

Routes: `app/ledger/{forecast,revenue-bridge,profitability,rev-rec,statements,exec-pack,commercial-intelligence,margin}/`
Components: `components/finance-os/{forecast,revenue-bridge,profitability,rev-rec,statement-factory,exec-pack,ci}/`
Lib: `lib/finance-os/{revrec,profitability}.ts`, **`lib/finance-os/ci/**` (entire tree: agent, tavily, engines, competitor/market/territory/win-loss/sku/growth…)**
Client tools: `components/finance/{CommissionTool,MarginTool,VarianceTool,ForecastTool}.tsx`, retire `app/dashboard/finance/page.tsx`
Any CI/exec API routes under `app/api/*` that only serve deleted modules.

> ⚠ The CI tree is large (Tavily web-research agent, many engines). Confirm nothing outside Finance OS imports it (e.g. Research OS reusing Tavily) **before** deletion — see Phase 1 dependency grep. If Research wants the Tavily client, relocate it to `lib/research/` rather than delete.

---

## 3. Migration phases (ordered, no code yet)

**Phase 0 — Safety**
- Branch (`finance-os-migration`); snapshot. No backwards-compat needed for deleted modules, but keep the branch for rollback.

**Phase 1 — Dependency map (read-only)**
- Grep every import of the DELETE paths. Confirm zero references from non-Finance surfaces. Relocate any genuinely-shared util (e.g. Tavily) out of `ci/` first.
- Output: a "safe to delete" confirmation list.

**Phase 2 — Module registry → 5 flagships**
- Edit `lib/fpa/modules.ts` + `lib/finance-os/modules.ts` + ledger sub-nav to expose only: Executive Dashboard, Commission Studio, BI Studio, Pricing Studio, Variance Studio, Commentary AI. (Removes obsolete modules from nav *before* deleting code → app stays green.)

**Phase 3 — Rebrand shell (no plumbing rewrite)**
- "NEXERA Ledger" → "Finance OS" in `FpaShell`/sidebar/titles. Keep the `/ledger` route tree + `FpaShell` + `FosThemeProvider` (already warm). Sidebar item `Ledger` → `Finance OS`.

**Phase 4 — Wire the five apps onto kept infra**
- Commission Studio, Variance Studio: already exist → keep, deepen to flagship per architecture.
- Pricing Studio (`/ledger/pricing`): assemble from `margin` + `deal-desk` + `pricing.ts` + `scenario.ts`.
- BI Studio (`/ledger/bi`): new screens on `ingest`/`mapping`/`UploadMapper` + export.
- Commentary AI (`/ledger/commentary`): new on `ai.ts` + `generate.ts`; salvage exec-pack deck templates.
- Executive Dashboard (`/ledger`): rebuilt landing.

**Phase 5 — Privacy/temp-data**
- Swap the global `.rak/finance-data.json` store for the per-session TTL store; default every upload to **Analyze-Only** (per privacy doc). Reuse the same upload UI.

**Phase 6 — Delete obsolete code**
- Remove the Phase-2-confirmed DELETE list. Retire `/dashboard/finance` → redirect `/ledger`.

**Phase 7 — Cleanup & verify**
- Remove dead imports, dead `samples`/`types` entries, dead API routes.
- `npx tsc --noEmit` + `npm run build` must pass.
- Grep for stale "Ledger" strings, dangling routes, 404s.
- Screenshot `/ledger` + each flagship (desktop + mobile) to confirm warm DS intact.

---

## 4. Route map (before → after)

| Before | After |
|---|---|
| `/ledger` (module hub) | **Finance OS — Executive Dashboard** |
| `/ledger/commission` | **Commission Studio** (kept, deepened) |
| `/ledger/variance` | **Variance Studio** (kept, deepened) |
| `/ledger/margin` | → folded into **`/ledger/pricing`** (Pricing Studio) |
| `/ledger/{forecast,revenue-bridge,profitability,rev-rec,statements,exec-pack,commercial-intelligence}` | **removed** (404 / redirect to `/ledger`) |
| *(new)* | `/ledger/pricing` · `/ledger/bi` · `/ledger/commentary` |
| `/dashboard/finance` (calculators) | **retired** → redirect `/ledger` |

---

## 5. Risks & mitigations
- **Dangling imports** from deleted modules → Phase 1 grep gates every delete.
- **Shared util buried in CI** (Tavily/research-core) → relocate before deleting `ci/`.
- **Module registry drives FPA `[module]` dynamic route** → update registry first (Phase 2) so removed modules 404 cleanly, not crash.
- **Temp-data store is global today** → Phase 5 fixes the privacy leak as part of migration, not after.
- **Warm DS regressions** → final screenshot pass.

---

## 5b. Phase 1 results — dependency map (executed, read-only)

Grepped every import of the DELETE targets across `app/ components/ lib/`. Result: **safe to delete, with ONE required pre-step** (relocate Tavily).

**Self-contained → delete cleanly (zero external refs):**
- `lib/finance-os/revrec.ts` → imported only by `components/finance-os/rev-rec/RevRec.tsx` (deleted).
- `lib/finance-os/profitability.ts` → imported only by `components/finance-os/profitability/Profitability.tsx` (deleted).
- `components/finance-os/{forecast,revenue-bridge,profitability,rev-rec,statement-factory,exec-pack,ci}/**` → **no external imports**; reached only via the module registries.

**⚠ BLOCKER — CI tree is shared with Research OS:**
- `app/api/research/route.ts` imports `lib/finance-os/ci/agent/tavily.ts` (`tavilySearch`).
- `tavily.ts` imports `./search-key.ts` (`getSearchKey`); `search-key.ts` also backs `app/api/admin/ci-search-key/route.ts`, used by `app/admin/page.tsx` (the web-search API-key admin).
- → **RELOCATE before deleting `ci/`:** move `tavily.ts` + `search-key.ts` out to `lib/web/` (or `lib/research/`); repoint `/api/research` and `/api/admin/ci-search-key` (optionally rename route `ci-search-key` → `web-search-key`). **Keep** the admin key route + UI (it's the global web-search key, not CI-specific).
- The rest of `ci/agent/{research-core,openrouter,client,store,types}.ts` is used **only** by `/api/ci/*` (competitor-discovery/news/research) → those API routes delete **with** CI.

**DELETE the CI surface (after relocate):**
- `lib/finance-os/ci/**` (minus the two relocated files), `components/finance-os/ci/**`, `app/ledger/commercial-intelligence/`, `app/api/ci/**`.

**Rewire points (KEEP infra that currently references deletables):**
- `lib/fpa/modules.ts` + `lib/finance-os/modules.ts` — registries list every obsolete module (forecast/revenue-bridge/profitability/rev-rec/statements/exec-pack/commercial-intelligence). **Edit to the 5 flagships** (Phase 2) — this is the single wiring point that removes them from nav.
- `components/fpa/ModuleView.tsx` — imports all four client `*Tool`s (`Variance/Commission/Forecast/Margin`); also `app/dashboard/finance/page.tsx`. ModuleView is **kept infra** → must be **rewired** to the new flagship components when the calculators are removed (Phase 4), not blindly deleted.

**Net:** delete list confirmed; only action gating it is the Tavily/search-key relocate + the two registry edits + ModuleView rewire. No surprises elsewhere.

---

## 5c. Infrastructure Audit — KEEP / MODERNIZE / REMOVE

Principle: **preserve infrastructure, replace only product-specific module logic.** The Ledger infra is strong and already local-first/privacy-aligned — keep it.

### ✅ KEEP (infrastructure — do not rewrite)

| Area | Files | Why |
|---|---|---|
| **Upload pipeline** | `lib/finance-os/ingest.ts` (CSV/XLSX, browser-only), `mapping.ts` (auto column-map + reusable templates), `components/finance-os/{FileDrop,UploadMapper,ColumnMapper}`, `/api/extract` (stateless) | Multi-format, on-device, template-able. Exactly the privacy-first ingest we want. |
| **Export engine** | `lib/finance-os/export.ts` (xlsx + jspdf-autotable + csv, client-side), `components/finance-os/ExportMenu`, `lib/gen/generate.ts` | Client-side generation, nothing uploaded. |
| **Local-first persistence** | `lib/finance-os/db.ts` (**IndexedDB** — settings, templates, plans, *explicit* saves only) | Already the "save only when user chooses" mechanism. |
| **Shared engines** | `audit.ts` (immutable AuditRecord), `scenario.ts` (Base/Best/Worst), `validate.ts` (rule→Exceptions), `types.ts`, `ai.ts` (AI-assist seam — AI never does core calc) | Cross-module, product-agnostic primitives. `ai.ts`'s "AI is secondary, never calculates" is the right posture. |
| **Copilot grounding** | `lib/fpa/context.ts` (token-bounded grounding string) | Reusable server/client; feeds the Finance Copilot. |
| **Shared UI infra** | `components/finance-os/dashboard/{Charts,DataGrid,FilterContext}`, `ExceptionPanel`, `system/{Modal,theme,toast}` | Product-agnostic widgets + the warm `FosThemeProvider`. |
| **Shell / nav** | `components/{fpa/{FpaShell,ModuleNav,TopBar,ModuleView},finance-os/{Shell,ModuleScreen,WorkspaceBar}}`, `app/ledger/layout.tsx` | Navigation chrome — reused, just rebranded. |
| **Router** | NEX·ERA Router (`lib/llm/*`, `components/AIRouter`, `RightPanel`) | Model routing for the copilot. |
| **Session** | `lib/auth/session.ts` (`SESSION_COOKIE`) | Auth/session — untouched. |
| **State** | React context (`FilterContext`, `theme`, `toast`) + IndexedDB + in-memory datasets | No rewrite; sound local-first state model. |

### 🔧 MODERNIZE (keep the capability, upgrade the implementation)

| Target | Change | Why |
|---|---|---|
| `lib/fpa/dataStore.ts` + `/api/fpa/data` | Replace global gitignored-JSON file with **per-session TTL store** (Upstash) **or** drop the server store and ground the copilot from `db.ts`/in-memory | **The one infra defect** — global, cross-user, persistent (privacy violation, see `FINANCE_OS_PRIVACY.md`). |
| finance-os UI primitives (`dashboard/Charts`, `dashboard/DataGrid`, `system/Modal`) | **Converge onto warm `components/uikit`** (Charts→`Sparkline`/chart wrappers, DataGrid→`Table` w/ sticky/sort/hover, Modal→uikit dialog) | finance-os does **not** import `uikit` today → two parallel design systems. Converge to remove drift. |
| Upload UI (`FileDrop`/`UploadMapper`) | Add the **Analyze-Only ⭐ / Save / Download** control | Enforce temporary-by-default; keep the existing parser. |
| `export.ts` | Add **PPTX** export | Variance/Commentary decks. |
| Registries `lib/{fpa/modules,finance-os/modules}.ts` | Trim to the **5 flagships** | Single nav-wiring point. |
| `components/fpa/ModuleView.tsx` | Rewire from client `*Tool`s → flagship components | Tools removed; renderer kept. |
| `lib/finance-os/scenario.ts` | Wire the skeleton into **Pricing + Variance** | Currently "used later"; now used. |

### ❌ REMOVE (product-specific logic that no longer belongs)

| Remove | Notes |
|---|---|
| **Commercial Intelligence** — `lib/finance-os/ci/**` (minus relocated `tavily`+`search-key`), `components/finance-os/ci/**` (incl `ci/modules/ui.tsx`), `app/api/ci/**`, `app/ledger/commercial-intelligence` | Market/competitor web-research — not finance, anti-scope. |
| `lib/finance-os/{revrec,profitability}.ts` + `components/finance-os/{rev-rec,profitability,forecast,revenue-bridge,statement-factory,exec-pack}/` | Obsolete modules (§1). |
| Client calculators `components/finance/{CommissionTool,MarginTool,VarianceTool,ForecastTool}.tsx` + `app/dashboard/finance/page.tsx` | "No calculators." Salvage parse helpers, delete UIs. |
| Dead entries in `lib/finance-os/{modules,samples,types}.ts` | Sample data / types for removed modules. |

**Not infra — product logic rebuilt into flagships (not "removed", modernized):** `commission/{PlanStudio,Statements}` → Commission Studio; `variance/VarianceExplorer` → Variance Studio; `margin/MarginAnalysis` + `deal-desk` → Pricing Studio.

**One-line verdict:** the plumbing is keepable as-is; only `dataStore.ts` needs a privacy modernize, finance-os UI should converge onto `uikit`, and the obsolete *modules* (not the infra under them) get removed.

---

## 6. What this migration explicitly does NOT do
- ❌ Create a new application or new route namespace (stays in `/ledger`, rebranded).
- ❌ Rewrite upload / export / nav / session / privacy / design infra.
- ❌ Preserve obsolete modules or their data.
- ❌ Add a 6th app, calculators, accounting, or the CI/market-research engine.
