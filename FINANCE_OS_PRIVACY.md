# NEX·ERA — Finance OS Privacy-First Architecture + Platform Upload Audit & Framework Plan

> Status: **architecture + plan only. No code written.**
> Part 1 = the privacy principle (source of truth). Part 2 = audit of every upload surface today. Part 3 = the unified Upload Framework implementation plan.

---

## PART 1 — Finance OS Privacy-First Architecture (principle)

### Core principle
Finance OS is a **workspace, not a cloud storage platform.** User files exist only for the duration of the current session unless the user **explicitly** chooses to save them.

### Default behaviour
On upload (Excel / CSV / PDF / Power BI dataset / financial statements) the system: reads → builds AI context → generates insights → dashboards → reports → allows edit/export. On session close or refresh (unless saved) the uploaded data is **removed**. **No financial data is permanently stored by default.**

### User controls (every upload presents three options)
- **Analyze Only (default ⭐)** — temporary processing only, no server storage, auto-deleted after the session.
- **Save Workspace** — persists only on explicit request, inside the user's own workspace.
- **Download Results** — export Excel / Power BI assets / PDF / PowerPoint / CSV.

### Example workflows
- **Excel AI**: upload → analyse → suggest KPIs → formulas → dashboard → download workbook → original discarded unless saved.
- **Power BI AI**: upload dataset → profile tables → suggest relationships → DAX → visuals → teach concepts → export → dataset removed unless saved.
- **Pricing Studio**: upload pricing workbook → calculate → scenarios → download → temp deleted.
- **Commission OS**: import commission data → calculate payouts → statements → export Excel/PDF → temp deleted.

### Privacy principles
- No permanent storage by default.
- No training AI models on customer financial data.
- Explicit save action required before any persistence.
- Users remain in control of their data.
- Finance professionals should feel safe uploading confidential spreadsheets because **temporary analysis is the default**.

---

## PART 2 — Codebase Upload Audit (current state, as-is)

Every upload-enabled surface, traced to its endpoint and storage behaviour.

| # | Surface (route / component) | Endpoint | Where data goes | Stays on server? | Browser-only? | Temp storage? | Cleanup? | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **Chat attach** (`components/dashboard/ChatInterface.tsx`) | `/api/extract` | Parsed to text in **server RAM** during the request; text returned to client | **No** | No (server parse) | In-memory only | GC after response | ✅ Compliant |
| 2 | **Studio drop** (`components/studio/{Composer,store,StudioShell}.tsx`) | `/api/extract` + client `XLSX.read` | XLSX parsed **in browser**; PDF/DOCX via stateless `/api/extract`; blocks persist in `localStorage` | **No** | Partly (xlsx client) | In-memory / client | client store, user-owned | ✅ Compliant |
| 3 | **Research PDF** (`components/research/ResearchHub.tsx`) | `/api/extract` → `/api/run` | Text extracted in server RAM; summary streamed; "Save to World" is **explicit**, client `localStorage` | **No** | No (server parse) | In-memory | explicit save only | ✅ Compliant |
| 4 | **Finance tools** (`/dashboard/finance`, `components/finance/shared.tsx`) | — (none) | CSV parsed **client-side** (`FileReader`); never leaves the browser | **No** | ✅ **Yes** | Browser memory | Tab close | ✅ **Best-in-class** ("runs entirely in your browser") |
| 5 | **Worlds files** (`components/worlds/*`) | — | Attached items in `localStorage` (`nexera.worlds.v1`) | **No** | Yes | Client disk (persistent, user-owned) | User deletes | ✅ Compliant (client-persist) |
| 6 | **Documents / Files page** (`app/dashboard/files/page.tsx`) | **`/api/fpa/data`** | **`.rak/finance-data.json` on server disk** (`lib/fpa/dataStore.ts`) | **YES — persists** | No | **No (durable)** | **Manual DELETE button only** | ❌ **VIOLATION** |
| 7 | **Finance-OS / FPA upload** (`components/finance-os/FileDrop.tsx`) | **`/api/fpa/data`** | Same global `.rak/finance-data.json` | **YES — persists** | No | No | Manual only | ❌ **VIOLATION** |
| 8 | **Coding Workspace** (`components/workspace/*`) | `/api/workspace/file` | **Real disk** in a user-chosen root + `.rak/workspace.json` | Yes (dev only) | No | No | Manual | ⚠ **Exception** — prod-disabled by middleware, admin-only, edits *your own folder* (IDE paradigm, not "upload a confidential file") |

### Critical findings
1. **`/api/fpa/data` + `lib/fpa/dataStore.ts` break the privacy principle.** Uploaded financial data is written to a **single global file** `.rak/finance-data.json` that:
   - **persists** across sessions and refreshes (not temporary),
   - is **not scoped per user** → one user's `getDataset()` returns **another user's** uploaded financials (multi-tenant data leak),
   - has **no auto-cleanup** (only a manual DELETE),
   - offers **no Analyze/Save/Download choice** — it saves by default.
   This is the Documents/Files page **and** the Finance-OS FPA copilot ingestion path. Highest-priority fix.
2. **Everything else is already compliant.** The `/api/extract` path (chat, studio, research) is stateless — bytes touch server RAM only for the duration of one request, nothing is persisted, nothing trains a model. Finance tools and Worlds are client-only.
3. **`/api/extract` is "stateless server parse", not "browser-only".** File bytes transit server memory (needed for `pdf-parse`/`mammoth`/`xlsx`). No storage, but worth labelling honestly in the framework: *non-persistent* ≠ *never-leaves-device*.
4. **Workspace fs is a deliberate exception** (own-folder IDE), already gated: middleware returns 403 for `/api/workspace/*` in production and restricts to admin. Document it as the one intentional persistence path; out of scope for the upload framework.

---

## PART 3 — Unified Upload Framework (implementation plan, no code)

One upload behaviour shared by **Finance OS · Research OS · Document OS · Language OS · Agent OS**. Default everywhere: **Analyze Only (temporary)**. Nothing persists without an explicit user choice.

### 3.1 Design goals
- Single reusable `<UploadZone>` + `useUpload()` everywhere → identical UX + identical guarantees.
- **Default = Analyze Only**, session-scoped, auto-expiring, never durable.
- Two explicit opt-ins surfaced on every upload: **Save to Workspace** and **Download**.
- Prefer **client-side parse** (zero server touch); fall back to **stateless server parse** only for formats that need server libs (PDF/DOCX).
- Per-module **adapters** vary only the *post-parse processing* and the *Save target* — not the upload mechanics.
- No training on uploaded data (explicit, documented, enforced by never persisting to any training sink).

### 3.2 Three lifecycles (what "temporary" actually means)

| Mode | Where parsed | Where context lives | TTL / cleanup |
|---|---|---|---|
| **Client-only** (CSV, XLSX, JSON, txt) | Browser (`FileReader`/`XLSX`) | Component state / in-memory | Tab close — never sent |
| **Stateless server parse** (PDF, DOCX, scanned) | Server RAM (one request) | Returned to client; optional ephemeral session cache | Request end; cache TTL |
| **Save Workspace** (explicit only) | — | User's own durable store (Worlds / per-user namespace) | User-owned, user-deletes |

Analyze-Only never enters mode 3.

### 3.3 Components & modules to build

**Shared UI (`components/uikit/upload/`)**
- `UploadZone` — drag/drop + file picker, format hint, progress, parsing skeleton, error + empty states (reuse warm-white DS). Accept list configurable per module.
- `UploadModeBar` — the **three-option control** rendered on every upload: `Analyze Only ⭐ (default)` · `Save to Workspace` · `Download ▾`. Analyze-Only is pre-selected; Save/Download require an explicit click.
- `UploadedChip` — per-file status (parsing / ready / error) with a "Discard now" action.
- `ExportMenu` — Excel / CSV / PDF / PPTX / Power BI assets (where applicable per module).
- `EphemeralBadge` — a persistent "Temporary · cleared on close" indicator so users see the privacy default.

**Shared hook (`lib/upload/useUpload.ts`)**
- `useUpload({ module, accept, parse })` → `{ files, addFiles, discard, mode, setMode, context, save, exportAs }`.
- Routes each file to client-parse or `/api/extract` based on type.
- Holds parsed `context` only in memory (Analyze-Only). `save()` and `exportAs()` are explicit calls.

**Shared server (`app/api/upload/`)** — replaces the leaky `/api/fpa/data`
- `POST /api/upload/extract` — stateless parse (wraps existing `lib/llm/extract.ts`); **never writes disk**. (Effectively today's `/api/extract`, generalised.)
- `POST /api/upload/session` — Analyze-Only context cache: store the *derived* dataset/context (not raw bytes) in an **ephemeral, per-session, TTL'd store** keyed by `sessionId + uploadId`.
- `DELETE /api/upload/session/:id` and `POST /api/upload/session/flush` — explicit + automatic clearing.
- `POST /api/upload/save` — the **only** durable path; writes to the user's own namespaced store (Worlds / per-user key), gated behind the explicit "Save to Workspace" action.

**Ephemeral store (`lib/upload/sessionStore.ts`)**
- Back with **Upstash Redis** (already a dependency: `@upstash/redis`) using `SET key value EX <ttl>` so entries **auto-expire** (e.g. 2–4h) and survive serverless cold starts/multi-instance (an in-memory `Map` would not on Vercel).
- Key = `upload:{sessionId}:{uploadId}`; `sessionId` derived from the existing `SESSION_COOKIE` (`lib/auth/session.ts`) → **per-user isolation by construction** (fixes the global-file leak).
- On logout (`/api/auth/logout`) → flush all `upload:{sessionId}:*`.
- Stores **derived context only** (columns, stats, sample rows, extracted text) — bounded — never the raw uploaded file.

### 3.4 Per-module adapters (same upload, different processing)
| Module | Accepts | Post-parse processing | "Save" target |
|---|---|---|---|
| **Finance OS** | xlsx, csv, pdf, pbix-data | KPIs, formulas, dashboards, DAX, scenarios | World / per-user dataset |
| **Research OS** | pdf, docx, url | extract → cite → summarise | Save to World (already exists) |
| **Document OS** (`/dashboard/files`) | pdf, docx, txt, md | extract → summarise/Q&A | World / per-user |
| **Language OS** | pdf, txt, audio (future) | vocab extraction, lesson context | learner profile (explicit) |
| **Agent OS** | any | feed as run input / knowledge source | Agent knowledge (explicit) |

All call `useUpload` with the same `UploadModeBar`; only `parse`/processing + `save` target differ.

### 3.5 Migration steps (ordered, no code yet)
1. **Build the shared kit** (`UploadZone`, `UploadModeBar`, `useUpload`, `sessionStore` on Upstash).
2. **Generalise** `/api/extract` → `/api/upload/extract` (keep stateless).
3. **Replace `/api/fpa/data`**: drop the global `.rak/finance-data.json` file store; route FPA + Documents through `/api/upload/session` (per-session, TTL). Provide `/api/upload/save` for explicit persistence.
4. **Migrate surfaces** to `useUpload` + `UploadModeBar`: Documents/Files page (#6) and Finance-OS FileDrop (#7) **first** (they're the violations), then Finance tools, Research, Studio, Chat adopt the shared kit for UX consistency (their behaviour is already compliant).
5. **Logout/expiry wiring**: flush ephemeral keys on logout; set TTL on every Analyze-Only write.
6. **Privacy UI**: `EphemeralBadge` on every upload; "Discard now" on chips; copy stating "Temporary — cleared on close unless you Save".
7. **Verify**: confirm no durable write occurs in Analyze-Only across all 5 modules; confirm per-user isolation; typecheck.

### 3.6 Security & privacy guarantees (acceptance criteria)
- Analyze-Only path performs **zero durable writes** (no `fs.writeFile`, no global file).
- Ephemeral context is **per-session keyed** and **TTL-expired**; flushed on logout.
- Only `/api/upload/save` writes durably, only on explicit user action, only to the user's own namespace.
- Raw uploaded bytes are **never persisted** — only bounded derived context, and only ephemerally.
- No path feeds uploaded data to any model-training sink.

### 3.7 What NOT to do
- ❌ Don't keep the single global `.rak/finance-data.json` (persistence + cross-user leak).
- ❌ Don't back the ephemeral store with an in-memory `Map` on serverless (lost on cold start, not shared across instances, no TTL guarantees) — use Redis TTL.
- ❌ Don't auto-save "for convenience" — explicit save only.
- ❌ Don't persist raw files; persist only derived, bounded context when the user opts in.
- ❌ Don't fold the coding Workspace (own-folder IDE) into this framework — different paradigm, already gated.
- ❌ Don't add an upload→training pipeline of any kind.

---

*Audit performed against the current tree. The only privacy violation found is the `/api/fpa/data` + `lib/fpa/dataStore.ts` global-file store (surfaces #6, #7); all other upload paths already satisfy the principle. The framework above makes "Analyze Only / temporary" the enforced default everywhere while keeping Save and Download as explicit, user-controlled actions.*
