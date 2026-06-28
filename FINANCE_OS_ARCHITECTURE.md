# NEX·ERA Finance OS — Product Architecture (Research & Design)

> **Design only. No code, no React, no implementation.**
> Five enterprise-grade flagship applications + one Executive Dashboard. Quality over quantity. Each app deep enough to be its own SaaS.

---

## 0. Vision & principles

Finance OS is **not** a folder of calculators. It is five deep, AI-native finance applications sharing one operating system: navigation, design language (warm-white Command Center), an AI copilot, a privacy-first upload framework, an approval/audit spine, and an export engine.

**Principles**
- Five apps, no more. Each is a flagship, not a feature.
- AI does the analyst's *drafting* (profiling, root-cause, narrative, recommendations); the human reviews/approves.
- **Analyze-Only is the default** for every upload (see `FINANCE_OS_PRIVACY.md`); persistence is explicit.
- Enterprise depth: workflows, approvals, audit trail, roles, versioning — not toy tools.
- Compose existing NEX·ERA: Router (model routing), Worlds (saved projects), context panel (live AI), uikit (warm DS).

**Hard "do NOT" (scope guards)**
- ❌ No additional apps beyond the five.
- ❌ No standalone calculators.
- ❌ Not SAP / not an ERP / not a GL / not accounting software / not a system of record.
- ❌ No bookkeeping, journal entries, tax, payroll, AP/AR ledgers.
- Finance OS is a **system of analysis & narrative on top of** the customer's existing systems — it reads exports, it doesn't replace the ledger.

---

## 1. Global Finance OS shell (shared by all five)

**Where it lives:** `/dashboard/finance` (Executive Dashboard) → five app routes. Reuses the 3-zone Command Center.

```
┌── Left nav (NEX·ERA sidebar) ─┬── Main workspace (fluid) ──────────────┬── Context panel (AI) ──┐
│  Finance OS                   │  app-specific canvas                   │  Finance Copilot       │
│   • Executive Dashboard       │  (tables, waterfalls, dashboards,      │  • live reasoning      │
│   • Commission Studio         │   narrative editor…)                   │  • suggested actions   │
│   • BI Studio                 │                                        │  • alerts / risks      │
│   • Pricing Studio            │                                        │  • cited sources       │
│   • Variance Studio           │                                        │                        │
│   • Commentary AI             │                                        │                        │
└───────────────────────────────┴────────────────────────────────────────┴────────────────────────┘
```

**Shared platform services (built once, used by all five):**
- **Upload Framework** — `UploadZone` + `Analyze-Only ⭐ / Save / Download` bar, session-TTL store (per the privacy doc).
- **Finance Copilot** — the context-panel AI: explains the screen, drafts, answers, cites; routes through the Router.
- **Approval Engine** — submit → review → approve/reject → audit, reused by Commission & Pricing.
- **Export Engine** — Excel / CSV / PDF / PowerPoint (+ Power BI assets where relevant), brand-templated.
- **Audit Trail & Versioning** — who changed what, when; scenario/version snapshots.
- **Roles & Permissions** — Admin / Finance / Manager / Viewer; per-app + per-record.
- **Project = a Finance World** — saving a project persists it as a NEX·ERA World (reuse Worlds store).

---

## 2. Executive Dashboard (unified landing)

**Job:** in 5 seconds, a CFO/FP&A lead sees the state of finance + jumps into work. Reuses the home widget-grid + context-panel pattern.

**Main grid (fluid auto-fit widgets, real data):**
| Widget | Content |
|---|---|
| **Finance KPIs** | Revenue, Gross Margin %, OpEx, EBITDA, vs plan deltas (sparklines) |
| **Recent Projects** | Last Commission/Pricing/Variance/BI/Commentary sessions (Worlds), resume |
| **Recent Reports** | Generated decks/statements/exports, re-open/download |
| **AI Alerts** | Material variances, margin breaches, dispute spikes, approaching deadlines |
| **Five App launch tiles** | Commission · BI · Pricing · Variance · Commentary (each with status badge) |
| **Close / cycle status** | Month-end progress, pending approvals count |

**Context panel:** Finance Copilot ("what changed since last month?"), pending approvals queue, upcoming scheduled runs. No chat hero.

**Not here:** raw data tables, calculators, duplicate KPIs already inside an app.

---

## 3. Commission Studio  *(reference: Xactly Incent)*

**Job-to-be-done:** Comp admins design plans, run calculations on real transactions, manage quotas, resolve disputes, publish payee statements — replacing "shadow spreadsheets."

**User journey**
```
Build/select plan → map data (orders, quotas, hierarchy) → run calculation →
review results by payee/team → handle disputes & adjustments → approve → publish statements → export
```

**Navigation (sub-nav within the app):** Plans · Calculations/Runs · Payees & Hierarchy · Quotas · Disputes · Statements · Reports · Settings.

**Key screens**
| Screen | Contents | Enterprise depth |
|---|---|---|
| **Plan Designer** | Rules, rate tables, tiers, accelerators, SPIFs, eligibility — a *Compensation Configurator* (visual rule builder, reusable components) | Versioned plans, effective-dating, what-if on a plan |
| **Calculation Run** | Run status, transaction volume, errors, recompute; "agent computer" style live progress | Handle large transaction sets; incremental recompute |
| **Payee Detail** | Per-rep: credits, attainment, payout, statement, history | Drill from transaction → rule → payout (full traceability) |
| **Quota Management** | Quotas by hierarchy, automated quota approvals | Org-hierarchy roll-up, manager approve flows |
| **Disputes** | Credit/payment inquiry workflow: open → investigate → resolve, threaded | Configurable workflow + audit |
| **Statements** | Branded payee statements, e-sign/acknowledge | Bulk publish, period locking |

**AI opportunities**
| Trigger | AI action | Output |
|---|---|---|
| Plan upload (PDF/Excel comp plan) | Parse into structured rules/tiers | Draft plan in the Configurator |
| Calc results | Anomaly detection (over/under-payment, ramp errors) | Flagged exceptions + explanation |
| Dispute opened | Summarize evidence, suggest resolution | Draft response + recommended adjustment |
| "Explain my commission" | Natural-language payout walkthrough | Rep-facing explanation w/ traceability |
| Plan design | Suggest accelerators/caps from attainment distribution | Plan recommendations |

**Governance:** plan approval, calc sign-off, period lock, full audit. **Export:** statements (PDF), payout register (Excel), exec summary (PPT).
**NOT included:** payroll disbursement, ERP posting, tax.

---

## 4. BI Studio  *(reference: Power BI Copilot + Excel Copilot — "world's best AI BI workspace")*

**Job-to-be-done:** Upload a messy workbook → get a profiled, KPI'd, dashboarded, DAX-ready analysis **and learn Power BI** along the way.

**User journey (the brief's flow)**
```
Upload Excel → AI profiles data → suggest KPIs → generate dashboard → generate DAX →
teach Power BI → generate Excel dashboard → dashboard review → export
```

**Navigation:** Data · Model · KPIs · Dashboard · DAX & Measures · Learn · Review · Export.

**Key screens**
| Screen | Contents |
|---|---|
| **Data Profiler** | Auto-detected tables, types, quality issues (nulls, dupes, outliers), suggested cleans |
| **Model View** | Relationship suggestions (star schema), fact/dim classification, grain check |
| **KPI Recommender** | Proposed measures w/ definitions + business rationale; accept/edit |
| **Dashboard Canvas** | Auto-generated visuals (cards, trends, breakdowns), responsive, recolored to warm DS |
| **DAX Studio** | Generated DAX per measure, explained line-by-line, copy-to-Power-BI |
| **Power BI Tutor** | Contextual teaching: "why this measure", "how to do this in Power BI", best practices |
| **Dashboard Review** | AI critique: chart-choice, cardinality, performance, accessibility, narrative gaps |

**AI opportunities:** data profiling, KPI/measure synthesis, DAX generation + explanation, visual selection, "teach me" tutor, dashboard critique, NL → chart.
**The differentiator (vs Power BI Copilot):** it's a **guided workspace that teaches**, produces both **Excel dashboards** and **Power BI assets (DAX, model, .pbix-ready definitions)**, and reviews the output for quality — not just a prompt box.
**Export:** updated Excel workbook w/ dashboard, DAX bundle, Power BI assets, PDF.
**NOT included:** becoming a live BI server / data warehouse / scheduled-refresh platform. Generates assets; doesn't host pipelines.

---

## 5. Pricing Studio  *(reference: Vendavo / Pricefx / PROS — "no calculators")*

**Job-to-be-done:** Upload pricing/deal data → see the **price waterfall & margins** → run **scenarios** → get **AI price guidance** → push through **approval** → export.

**User journey**
```
Upload pricing files → margin/waterfall review → scenario planning →
AI pricing recommendations → approval workflow → export
```

**Navigation:** Overview · Waterfall · Margin Analysis · Scenarios · Recommendations · Approvals · Export.

**Key screens**
| Screen | Contents |
|---|---|
| **Price Waterfall** | List → invoice → pocket price/margin; bridge of discounts, rebates, costs (Vendavo-style) |
| **Margin Bridge Analyzer** | What moved margin period-over-period (price/volume/mix/cost) |
| **Deal/Product Guidance** | Per-deal target/floor/stretch price bands; risk alerts on below-floor |
| **Scenario Planner** | Simulate price changes → revenue & margin impact before publishing; compare scenarios |
| **Recommendations** | AI price moves w/ rationale (cost/value/demand signals), expected lift |
| **Approval Queue** | Submit deal/price change → thresholds → auto-approve within guidance, else route |

**AI opportunities:** margin leak detection, price-band recommendation, scenario impact narrative, outlier/below-floor alerts, "explain this deal's margin", elasticity hints.
**Governance:** approval thresholds, auto-approve within guidance, audit, version per scenario.
**Export:** repriced workbook (Excel), scenario comparison (PDF/PPT), approval pack.
**NOT included:** CPQ/quote-to-cash execution, live ERP price publishing, billing. It advises & exports; it doesn't transact.

---

## 6. Variance Studio  *(reference: enterprise FP&A monthly variance)*

**Job-to-be-done:** Upload Budget + Forecast + Actuals → AI **detects variances, explains root cause, builds waterfalls, writes exec summary, drafts PPT commentary, suggests actions.** Compresses close from days to hours.

**User journey**
```
Upload Budget / Forecast / Actuals → auto-detect variances → driver decomposition (price/volume/mix) →
waterfall + bridges → root-cause explanations → exec summary → suggested actions → PPT commentary → export
```

**Navigation:** Inputs · Variances · Drivers/Bridge · Waterfall · Root Cause · Summary · Actions · Export.

**Key screens**
| Screen | Contents |
|---|---|
| **Variance Grid** | BvA / BvF / actual-vs-prior by line, % and $, materiality threshold, sortable, drill |
| **Bridge / Waterfall** | Decompose variance by **driver** (causal) and **chronological**; dominant contributors first |
| **Driver Decomposition** | Price / Volume / Mix / Rate / FX split per line |
| **Root-Cause Panel** | AI "why": attributes each material variance to drivers + context, cited to the data |
| **Executive Summary** | Auto summary: critical variances → causes → next steps (never a data dump) |
| **Action Tracker** | AI-suggested actions, owner, status |

**AI opportunities:** auto variance detection at threshold, driver decomposition, root-cause narrative, waterfall generation, exec summary, PPT speaker notes, "what should we do" actions.
**Workflow depth:** materiality rules, period compare, review/approve commentary, sign-off, close checklist.
**Export:** variance pack (Excel), waterfall deck + commentary (PPT), exec summary (PDF).
**NOT included:** the planning/budgeting *engine* (no Anaplan-style modeling); it analyzes the numbers you bring, it doesn't host the plan.

---

## 7. Commentary AI  *(reference: Datarails Storyboards / FP&A narrative)*

**Job-to-be-done:** Turn finance data + variance output into **CFO/board-grade narrative** — monthly/quarterly/board commentary, exec summaries, PPT speaker notes, Business Review docs.

**User journey**
```
Pick source (Variance Studio output / upload / KPIs) → choose template (Monthly / Quarterly / Board / Variance / Exec / Speaker notes / BR doc) →
AI drafts narrative → human edits in finance-grade editor → review/approve → export (Word/PPT/PDF)
```

**Navigation:** Sources · Templates · Draft/Editor · Review · Library · Export.

**Key screens**
| Screen | Contents |
|---|---|
| **Template Gallery** | Monthly, Quarterly, Board, Variance, Exec Summary, Speaker Notes, Business Review |
| **Narrative Editor** | Long-form editor w/ AI drafting, tone controls (CFO/board/operational), data-linked figures that stay accurate |
| **Fact-Linking** | Every number cites its source cell/variance; regenerate on data change |
| **Review** | Approval, comments, version compare, tone/consistency check |
| **Library** | Past commentaries, reusable phrasing, house style |

**AI opportunities:** first-draft narrative, tone/audience adaptation, "explain the why", consistency vs prior period, summarize-to-board, generate speaker notes from a deck.
**Quality bar:** structured (summary → drivers → outlook → actions), precise, no hallucinated numbers (fact-linked), house-style aware.
**Export:** Word, PPT (with speaker notes), PDF, board pack.
**NOT included:** generic copywriting / marketing content. Finance narrative only.

---

## 8. Cross-cutting architecture

**Data model (shared entities)**
- `FinanceProject` (= a World): name, app, owner, version, status, members.
- `Dataset` (ephemeral by default; session-TTL): columns, rows-preview, profile, source.
- `Scenario` / `Version`: immutable snapshots for compare + audit.
- `ApprovalRequest`: subject, thresholds, route, status, history.
- `Report/Artifact`: generated deck/statement/workbook + export metadata.
- `AuditEvent`: actor, action, target, timestamp.

**Approval Engine (Commission + Pricing + Commentary):** submit → threshold check → auto-approve or route by hierarchy → approve/reject + comment → lock + audit.

**AI substrate:** Finance Copilot in the context panel everywhere; routes through the NEX·ERA Router; always **cited** to source data; drafts, never silently overwrites; human-in-the-loop approval.

**Privacy:** all uploads default **Analyze-Only / session-temporary**; explicit Save persists to the user's World; no training on customer data (see `FINANCE_OS_PRIVACY.md`).

**Export Engine:** one branded export service → Excel, CSV, PDF, PPTX, Power BI assets.

---

## 9. Build sequencing (recommendation, when implementation starts)
1. **Shell + Executive Dashboard + Upload Framework + Copilot + Export** (the platform spine — every app needs it).
2. **Variance Studio** (highest AI leverage, clearest value, feeds Commentary).
3. **Commentary AI** (consumes Variance output — natural pair).
4. **BI Studio** (broad appeal, showcases AI).
5. **Pricing Studio** (waterfall + approvals).
6. **Commission Studio** (deepest/most enterprise — most workflow surface; do last with the approval engine mature).

---

## 10. Anti-scope (explicit cuts)
- ❌ More than five apps · standalone calculators · SAP/ERP/GL · accounting/bookkeeping · payroll/tax · live BI hosting · CPQ transaction · budgeting/planning engine · marketing copy.
- ❌ Permanent storage by default · training on customer financials · auto-save.
- ❌ Shallow tools — if a screen isn't workflow-deep, it doesn't ship.

---

## Sources
- Xactly Incent — [product](https://www.xactlycorp.com/products/xactly-incent), [ICM solutions](https://www.xactlycorp.com/solutions/incentive-compensation-management), [latest version / configurator](https://www.xactlycorp.com/company/press-room/latest-version-of-xactly-incent-helps-customers-improve-sales-compensation-efficiency)
- Pricing — [Vendavo enterprise pricing platform](https://www.vendavo.com/our-products/enterprise-pricing-platform/), [Vendavo pricing/waterfall](https://www.vendavo.com/platform/pricing/), [Pricefx best enterprise pricing](https://www.pricefx.com/learning-center/what-are-the-best-enterprise-pricing-software-options)
- FP&A variance — [Budget vs Actual (Wall Street Prep)](https://www.wallstreetprep.com/knowledge/budget-actual-variance-analysis-fpa/), [variance & root cause (Tellius)](https://www.tellius.com/finance/variance-analysis-root-cause), [art & science of variance (CFO Secrets)](https://www.cfosecrets.io/p/art-and-science-of-variance-analysis)
- Commentary / AI FP&A — [Datarails AI](https://www.datarails.com/datarails-ai/), [AI for financial analysis](https://www.datarails.com/ai-for-financial-analysis/)
