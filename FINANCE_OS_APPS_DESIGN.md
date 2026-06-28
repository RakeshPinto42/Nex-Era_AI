# NEX·ERA Finance OS — The Five Applications (Deep Product Design)

> **Product design only. No code, no React.** Five enterprise applications, each designed across: Landing · Navigation · Enterprise workflow · Screens · Tabs · Workspace · Tables · AI features · Reports · Exports · History · Audit.

---

## Shared platform (referenced by all five — already built infra)

- **Shell:** 3-zone Command Center — left nav · center workspace · right **Finance Copilot** context panel (live reasoning, suggested actions, cited sources). Warm-white DS.
- **Upload:** `ingest` (CSV/XLSX, browser-only) + `mapping` (auto column-map + reusable templates) + **Analyze-Only ⭐ default** (Save / Download explicit).
- **Validation:** `validate` rules → `ExceptionPanel` (every dataset surfaces quality issues before analysis).
- **Scenario engine:** Base / Best / Worst snapshots (Pricing + Variance).
- **Audit:** immutable `AuditRecord` per run (who/what/when), persisted only in a saved workspace.
- **Export engine:** Excel · CSV · PDF · PPTX (+ Power BI assets).
- **Persistence:** local-first IndexedDB; nothing durable unless the user Saves.
- **Copilot rule:** AI **drafts**; human **reviews/approves**; every number cited to source.

Per-app design below. Each app = one route under `/ledger` (Finance OS).

---

# 1. Commission Studio
*Reference: Xactly Incent. Users: Comp Admin, Sales Ops, Finance, Manager, Rep (viewer).*

**Job:** design plans → run calcs on real transactions → manage quotas → resolve disputes → publish payee statements. Kills shadow spreadsheets.

### Landing (in-app home)
Period selector + a **comp cockpit**: cards — *Total payout (period)*, *Attainment distribution*, *Open disputes*, *Pending approvals*, *Last calc status*. Below: Recent plans, Recent runs. Context panel: copilot ("explain this period's payout swing"), pending approvals queue.

### Navigation (sub-tabs)
`Plans · Runs · Payees · Quotas · Disputes · Statements · Reports · Settings`

### Enterprise workflow
```
Design/clone plan → map data (orders, hierarchy, quotas) → validate → run calc →
review results (by payee/team) → exceptions & adjustments → dispute resolution →
approval/sign-off → period lock → publish statements → export
```
Gates: plan approval · calc sign-off · period lock (immutable after).

### Screens
| Screen | Purpose | Key elements |
|---|---|---|
| **Plan Designer** | Build comp logic | Visual **Compensation Configurator**: rules, rate tables, tiers, accelerators, caps, SPIFs, eligibility; effective-dating; clone/version |
| **Calculation Run** | Execute on transactions | Live run progress (agent-style), volume, errors, recompute (incremental); drill txn→rule→payout |
| **Payee Detail** | Per-rep transparency | Credits, attainment, payout, statement, history; full traceability chain |
| **Quota Management** | Quotas by hierarchy | Org roll-up, automated quota approvals, manager direct-reports view |
| **Disputes** | Credit/payment inquiries | Threaded workflow: open→investigate→resolve; evidence; SLA |
| **Statements** | Payee statements | Branded, bulk publish, acknowledge/e-sign |

### Tabs (within Plan Designer)
`Rules · Rate Tables · Quotas · Eligibility · Accelerators/SPIFs · Versions`

### Workspace
Configurator canvas (rule blocks) center; copilot drafts rules from an uploaded comp-plan PDF; what-if a plan change → live payout delta.

### Tables
- **Results grid:** Payee · Team · Attainment % · Credit $ · Rate · Payout $ · Adjustments · Status. Sort/filter/group by hierarchy; sticky header; row drill.
- **Transactions grid:** Order · Date · Product · Amount · Credited-to · Rule hit.
- **Disputes grid:** ID · Payee · Type · Status · Owner · Age.

### AI features
| Trigger | AI | Output |
|---|---|---|
| Comp-plan PDF upload | Parse → structured rules | Draft plan in Configurator |
| Calc results | Anomaly detection (over/under-pay, ramp errors) | Flagged exceptions + why |
| Dispute opened | Summarize evidence | Suggested resolution + adjustment |
| "Explain my commission" | NL walkthrough | Rep-facing, traceable |

### Reports
Payout register · Attainment distribution · Plan cost vs budget · Dispute aging · Manager roll-up.

### Exports
Statements (PDF, bulk) · Payout register (Excel) · Exec summary (PPT).

### History
Plan versions (effective-dated) · Calc run history (re-runnable) · Statement publish log.

### Audit
Every plan edit, calc run, adjustment, dispute action, approval, period lock → immutable AuditRecord (actor/time/before-after).

**NOT included:** payroll disbursement, ERP posting, tax.

---

# 2. BI Studio
*Reference: Power BI Copilot + Excel Copilot. Users: FP&A analyst, BI dev, finance manager.*

**Job:** upload a messy workbook → profiled, KPI'd, dashboarded, DAX-ready analysis — **and learn Power BI** along the way.

### Landing
Big **Upload / drop** zone + "Start from a template" (P&L, Sales, OpEx) + Recent analyses. Context panel: copilot ("what's in this file?").

### Navigation (the workflow IS the nav)
`Data · Model · KPIs · Dashboard · DAX · Learn · Review · Export`

### Enterprise workflow
```
Upload Excel → AI profiles data → suggest KPIs → generate dashboard → generate DAX →
teach Power BI → generate Excel dashboard → dashboard review → export
```

### Screens / Tabs
| Tab | Purpose | Key elements |
|---|---|---|
| **Data Profiler** | Understand the file | Tables, types, quality (nulls/dupes/outliers), suggested cleans (via `validate`/ExceptionPanel) |
| **Model View** | Star schema | Relationship suggestions, fact/dim classification, grain check |
| **KPI Recommender** | Measures | Proposed KPIs w/ definitions + business rationale; accept/edit |
| **Dashboard Canvas** | Visuals | Auto cards/trends/breakdowns, warm-DS recolor, responsive |
| **DAX Studio** | Measures-as-code | Generated DAX per measure, **explained line-by-line**, copy-to-PBI |
| **Power BI Tutor** | Teach | Contextual "why this measure / how in Power BI" + best practices |
| **Review** | QC | AI critique: chart choice, cardinality, performance, a11y, narrative gaps |

### Workspace
Split: data/model left, dashboard canvas center, copilot right (drafts measures, explains, teaches). Drag fields → chart; NL → chart.

### Tables
- **Profile grid:** Column · Type · % null · Distinct · Min/Max/Avg · Issues · Suggested action.
- **Measures grid:** Measure · Definition · DAX · Format · Status.

### AI features
Data profiling · KPI/measure synthesis · DAX generation+explanation · visual selection · "teach me" tutor · dashboard critique · NL→chart.
**Differentiator vs Power BI Copilot:** a *guided, teaching* workspace that outputs **both Excel dashboards and Power BI assets** and **reviews** them.

### Reports
Generated dashboard (Excel) · Measure dictionary · Model diagram · Review report.

### Exports
Updated **Excel** workbook w/ dashboard · **DAX bundle** · **Power BI assets** (.pbix-ready definitions) · PDF.

### History
Analysis sessions (re-open) · measure versions · dashboard versions.

### Audit
Upload → profile → generated assets chain logged; data is Analyze-Only by default (discarded unless Saved).

**NOT included:** live BI hosting / data warehouse / scheduled refresh. Generates assets, doesn't run pipelines.

---

# 3. Pricing Studio
*Reference: Vendavo / Pricefx / PROS. Users: Pricing manager, deal desk, sales ops, finance.* **No calculators.**

**Job:** upload pricing/deal data → see **waterfall & margins** → run **scenarios** → get **AI guidance** → push through **approval** → export.

### Landing
**Margin cockpit**: pocket margin %, margin leak $, deals below floor, approvals in queue. Recent scenarios. Context panel: copilot ("where is margin leaking?"), approval queue.

### Navigation
`Overview · Waterfall · Margin · Scenarios · Recommendations · Approvals · Export`

### Enterprise workflow
```
Upload pricing files → margin/waterfall review → scenario planning →
AI pricing recommendations → approval (thresholds/auto-approve) → export
```
Gates: guidance thresholds → auto-approve within band, else route.

### Screens / Tabs
| Screen | Purpose | Key elements |
|---|---|---|
| **Price Waterfall** | List→pocket | Discounts/rebates/cost steps → net price & pocket margin (Vendavo-style bridge) |
| **Margin Bridge** | What moved margin | Price/Volume/Mix/Cost decomposition period-over-period |
| **Deal/Product Guidance** | Bands | Target/Floor/Stretch price per deal/SKU; below-floor risk alerts |
| **Scenario Planner** | Simulate | Price-change → revenue & margin impact; compare scenarios (Base/Best/Worst via `scenario`) |
| **Recommendations** | AI moves | Price recs w/ rationale (cost/value/demand), expected lift |
| **Approval Queue** | Govern | Submit → threshold check → auto/route; status; comments |

### Workspace
Waterfall canvas center; scenario controls; copilot drafts recs + explains each deal's margin. Compare-scenarios side-by-side.

### Tables
- **Deal grid:** Deal/SKU · List · Net · Pocket margin % · vs Floor · Guidance · Approval status.
- **Scenario compare:** Metric · Base · Scenario A · Scenario B · Δ revenue · Δ margin.

### AI features
Margin-leak detection · price-band recommendation · scenario impact narrative · below-floor/outlier alerts · "explain this deal's margin" · elasticity hints.

### Reports
Margin waterfall · margin bridge · scenario comparison · approval pack · price list (repriced).

### Exports
Repriced workbook (Excel) · scenario comparison (PDF/PPT) · approval pack.

### History
Scenario versions (immutable snapshots) · approval history · price-change log.

### Audit
Every scenario, recommendation accept/reject, approval decision, threshold override → AuditRecord.

**NOT included:** CPQ/quote execution, live ERP price publishing, billing. Advises & exports.

---

# 4. Variance Studio
*Reference: enterprise FP&A monthly variance. Users: FP&A analyst, controller, finance lead.*

**Job:** upload Budget + Forecast + Actuals → AI detects variances, explains root cause, builds waterfalls, writes exec summary + PPT commentary, suggests actions. Compresses close from days → hours.

### Landing
**Close cockpit**: materiality-flagged variances count, top movers, close progress. Recent analyses. Context panel: copilot ("why did EBITDA miss?"), suggested actions.

### Navigation
`Inputs · Variances · Drivers · Waterfall · Root Cause · Summary · Actions · Export`

### Enterprise workflow
```
Upload Budget/Forecast/Actuals → auto-detect variances (threshold) →
driver decomposition (price/volume/mix/FX) → waterfall + bridges →
root-cause narrative → exec summary → suggested actions → PPT commentary → export
```
Gate: review/approve commentary → sign-off.

### Screens / Tabs
| Screen | Purpose | Key elements |
|---|---|---|
| **Inputs** | Map 3 datasets | Budget/Forecast/Actuals upload + map; period align |
| **Variance Grid** | The numbers | BvA / BvF / vs-prior by line; $ and %; materiality threshold; drill |
| **Driver Decomposition** | Why (quant) | Price/Volume/Mix/Rate/FX split per line |
| **Bridge / Waterfall** | Tell the story | Driver (causal) + chronological waterfalls; dominant contributors first |
| **Root-Cause** | Why (narrative) | AI attributes each material variance to drivers + context, cited |
| **Executive Summary** | The takeaway | Summary → causes → next steps (never a data dump) |
| **Actions** | Follow-through | AI-suggested actions, owner, status |

### Workspace
Variance grid + waterfall center; copilot writes root-cause + summary; toggle materiality threshold live.

### Tables
- **Variance grid:** Line · Budget · Forecast · Actual · BvA $ · BvA % · BvF % · Material? · Driver · Commentary.
- **Actions grid:** Action · Owner · Due · Status.

### AI features
Auto variance detection · driver decomposition · root-cause narrative · waterfall generation · exec summary · **PPT speaker notes** · "what should we do" actions.

### Reports
Variance pack · waterfall deck · exec summary · action tracker.

### Exports
Variance pack (Excel) · waterfall + commentary (PPT) · exec summary (PDF).

### History
Monthly analyses (period-keyed) · commentary versions · prior-period compare.

### Audit
Inputs, thresholds, generated commentary, edits, sign-off → AuditRecord.

**NOT included:** the planning/budgeting engine (no Anaplan-style modeling). Analyzes numbers you bring.

---

# 5. Commentary AI
*Reference: Datarails Storyboards / FP&A narrative. Users: FP&A lead, controller, CFO office.*

**Job:** turn finance data + variance output into **CFO/board-grade narrative** — monthly/quarterly/board commentary, exec summaries, PPT speaker notes, Business Review docs.

### Landing
**Template gallery** (Monthly · Quarterly · Board · Variance · Exec Summary · Speaker Notes · Business Review) + Recent commentaries + Library (house style). Context panel: copilot (tone/audience controls).

### Navigation
`Sources · Templates · Draft/Editor · Review · Library · Export`

### Enterprise workflow
```
Pick source (Variance Studio output / upload / KPIs) → choose template →
AI drafts narrative → human edits (finance-grade editor) → review/approve → export
```
Gate: review/approve before export (board content).

### Screens / Tabs
| Screen | Purpose | Key elements |
|---|---|---|
| **Sources** | Bind data | Pull Variance output / upload / KPIs; **fact-link** every figure |
| **Template Gallery** | Pick format | Monthly/Quarterly/Board/Variance/Exec/Speaker-notes/BR doc |
| **Narrative Editor** | Write | Long-form AI drafting, tone controls (CFO/board/operational), data-linked figures stay accurate |
| **Review** | QC + approve | Comments, version compare, tone/consistency check vs prior period |
| **Library** | Reuse | Past commentaries, reusable phrasing, house style |

### Workspace
Document editor center (Word-like), copilot drafts/rewrites by tone; fact-link sidebar shows each number's source cell; regenerate on data change.

### Tables
- **Fact-link table:** Figure · Source (cell/variance) · Current value · In-sync?
- **Version table:** Version · Author · Date · Status.

### AI features
First-draft narrative · tone/audience adaptation · "explain the why" · consistency vs prior · summarize-to-board · generate speaker notes from a deck. **No hallucinated numbers** (fact-linked).

### Reports
Monthly/Quarterly/Board commentary · Exec summary · Business Review doc · Speaker notes.

### Exports
Word · PPT (w/ speaker notes) · PDF · board pack.

### History
Commentary versions (compare) · per-period library.

### Audit
Source binding, draft, edits, approval, export → AuditRecord; figures traceable to source.

**NOT included:** generic/marketing copywriting. Finance narrative only.

---

## Cross-app consistency (design contract)
- Same shell, same upload control (Analyze-Only default), same export menu, same audit trail, same copilot pattern in the context panel.
- Each app's **landing = a cockpit** (KPIs + queue + recent), not a chat box.
- Each app's **workspace = a bespoke canvas** (Configurator / dashboard / waterfall / variance grid / narrative editor) → every app feels like its own product, not a tab.
- Variance Studio **feeds** Commentary AI (natural pair); Pricing + Variance share the `scenario` engine; Commission + Pricing share the Approval Engine.

## Sources
- Xactly Incent — [product](https://www.xactlycorp.com/products/xactly-incent), [ICM](https://www.xactlycorp.com/solutions/incentive-compensation-management)
- Vendavo — [pricing/waterfall](https://www.vendavo.com/platform/pricing/), [enterprise pricing platform](https://www.vendavo.com/our-products/enterprise-pricing-platform/); Pricefx — [enterprise pricing options](https://www.pricefx.com/learning-center/what-are-the-best-enterprise-pricing-software-options)
- FP&A variance — [Wall Street Prep](https://www.wallstreetprep.com/knowledge/budget-actual-variance-analysis-fpa/), [CFO Secrets](https://www.cfosecrets.io/p/art-and-science-of-variance-analysis), [Tellius root cause](https://www.tellius.com/finance/variance-analysis-root-cause)
- Commentary — [Datarails AI](https://www.datarails.com/datarails-ai/), [AI for financial analysis](https://www.datarails.com/ai-for-financial-analysis/)
