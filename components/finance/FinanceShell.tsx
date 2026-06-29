"use client";

/* ============================================================================
   FINANCE OS — shared shell. One operating-system frame; only the workspace
   (children) changes between the five studios. Implements the regions from
   FINANCE_OS_SHELL.md: top bar (breadcrumbs · ⌘K · upload · export · temporary
   badge · approval · notifications · avatar), left-rail app switcher, workspace
   slot, tabbed context panel, status bar, command palette + shortcuts.

   Phase 1: chrome is real; the data-bound panels are placeholders. Built on the
   warm-white design system (convergence) + reused FosTheme/Toast providers.
   ========================================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu, X, Search, Upload, Download, Bell, ChevronRight, Sparkles,
  Activity as ActivityIcon, History, GitBranch, CheckCircle2, Clock, FileClock, PanelRight,
} from "lucide-react";
import { NexeraMark } from "@/components/Logo";
import { FINANCE_APPS, appForPath } from "@/lib/finance-os/apps";
import { FosThemeProvider } from "@/components/finance-os/system/theme";
import { ToastProvider } from "@/components/finance-os/system/toast";
import { FinanceUploadProvider, useFinanceUpload } from "@/components/finance-os/system/uploadStore";
import { ingestFile } from "@/lib/finance-os/ingest";
import { FILE_ROLES, type Dataset, type FileRole } from "@/lib/finance-os/types";
import { cx } from "@/components/uikit";
import { UploadModeBar } from "./UploadModeBar";

export function FinanceShell({ children }: { children: React.ReactNode }) {
  return (
    <FosThemeProvider>
      <ToastProvider>
        <FinanceUploadProvider>
          <ShellInner>{children}</ShellInner>
        </FinanceUploadProvider>
      </ToastProvider>
    </FosThemeProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const app = useMemo(() => appForPath(path), [path]);

  const [navOpen, setNavOpen] = useState(false);     // mobile rail drawer
  const [panelOpen, setPanelOpen] = useState(true);  // context panel
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => setNavOpen(false), [path]);

  // ---- keyboard shortcuts (⌘K palette, ⌘\ panel, ⌘U upload, Esc close) ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
      else if (mod && e.key === "\\") { e.preventDefault(); setPanelOpen((v) => !v); }
      else if (mod && e.key.toLowerCase() === "u") { e.preventDefault(); setUploadOpen(true); }
      else if (e.key === "Escape") { setPaletteOpen(false); setUploadOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-ink" style={{ colorScheme: "light" }}>
      {/* ===== LEFT RAIL ===== */}
      <Rail className="hidden w-[248px] flex-none lg:flex" path={path} />
      {navOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setNavOpen(false)} />
          <Rail className="fixed inset-y-0 left-0 z-50 flex w-[264px] lg:hidden" path={path} onClose={() => setNavOpen(false)} />
        </>
      )}

      {/* ===== MAIN COLUMN ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP BAR */}
        <header className="flex h-14 flex-none items-center gap-2 border-b border-line bg-surface/80 px-3 backdrop-blur-xl sm:px-4">
          <button onClick={() => setNavOpen(true)} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink lg:hidden">
            <Menu size={18} />
          </button>

          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            <Link href="/ledger" className="font-display font-semibold text-ink hover:text-brand">Finance OS</Link>
            {app.href !== "/ledger" && (
              <>
                <ChevronRight size={14} className="flex-none text-faint" />
                <span className="truncate font-medium text-muted">{app.name}</span>
              </>
            )}
          </nav>

          {/* ⌘K search/command */}
          <button onClick={() => setPaletteOpen(true)} className="ml-2 hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-faint transition-colors hover:bg-surface md:flex">
            <Search size={15} className="flex-none" />
            <span className="truncate">Search or run a command…</span>
            <kbd className="ml-auto flex-none rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</kbd>
          </button>

          <div className="flex-1 md:hidden" />

          {/* actions */}
          <div className="flex flex-none items-center gap-1.5">
            <TopButton onClick={() => setUploadOpen(true)} icon={<Upload size={16} />} label="Upload" />
            <ExportButton />
            <span title="This workspace is temporary — cleared when you close it unless you Save" className="hidden items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-[#b27400] sm:flex">
              <Clock size={12} /> Temporary
            </span>
            <span title="Approval status" className="hidden items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted lg:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-faint" /> Draft
            </span>
            <button title="Notifications" aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink">
              <Bell size={17} />
            </button>
            <button onClick={() => setPanelOpen((v) => !v)} title="Toggle context panel (⌘\\)" aria-label="Toggle context panel" className="hidden h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink xl:grid">
              <PanelRight size={17} />
            </button>
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gradient-to-br from-brand to-accent-soft text-xs font-bold text-white">FN</span>
          </div>
        </header>

        {/* WORKSPACE + CONTEXT PANEL */}
        <div className="flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          {panelOpen && <ContextPanel app={app} />}
        </div>

        {/* STATUS BAR */}
        <footer className="flex h-7 flex-none items-center gap-4 border-t border-line bg-surface px-4 font-mono text-[10.5px] text-faint">
          <span className="flex items-center gap-1.5 text-[#b27400]"><Clock size={11} /> Temporary · cleared on close</span>
          <span className="hidden sm:inline">✓ No unsaved changes</span>
          <span className="hidden sm:inline">⚙ Idle</span>
          <span className="ml-auto hidden items-center gap-1 sm:flex"><kbd className="rounded border border-line bg-surface-2 px-1">⌘K</kbd> Commands</span>
        </footer>
      </div>

      {/* ===== OVERLAYS ===== */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onUpload={() => { setPaletteOpen(false); setUploadOpen(true); }} router={router} />}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

/* --------------------------------------------------------------- left rail */
function Rail({ className, path, onClose }: { className?: string; path: string; onClose?: () => void }) {
  return (
    <aside className={cx("flex-col border-r border-line bg-surface", className)}>
      <div className="flex items-center gap-2.5 px-5 py-4">
        <NexeraMark size={26} />
        <div className="leading-tight">
          <p className="font-display text-sm font-bold text-ink">Finance OS</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">by NEXERA</p>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-ink lg:hidden"><X size={16} /></button>
        )}
      </div>

      <nav aria-label="Finance OS applications" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
        <p className="px-3 pb-1 pt-1 font-mono text-[9px] uppercase tracking-widest text-faint">Applications</p>
        {FINANCE_APPS.map((a) => {
          const active = a.href === "/ledger" ? path === "/ledger" : path.startsWith(a.href);
          const Icon = a.icon;
          return (
            <Link
              key={a.slug || "exec"}
              href={a.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                active ? "text-white" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
              style={active ? { background: a.accent } : undefined}
            >
              <span
                className={cx("grid h-6 w-6 flex-none place-items-center rounded-md", active ? "bg-white/20 text-white" : "")}
                style={active ? undefined : { background: `${a.accent}1f`, color: a.accent }}
              >
                <Icon size={14} />
              </span>
              <span className="truncate">{a.name}</span>
            </Link>
          );
        })}
      </nav>

      <Link href="/dashboard" className="border-t border-line px-5 py-3 text-xs text-muted hover:text-ink">← Back to NEXERA</Link>
    </aside>
  );
}

/* --------------------------------------------------------- context panel */
const PANEL_TABS = [
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "activity", label: "Activity", icon: ActivityIcon },
  { key: "history", label: "History", icon: History },
  { key: "versions", label: "Versions", icon: GitBranch },
  { key: "approvals", label: "Approvals", icon: CheckCircle2 },
  { key: "recent", label: "Recent", icon: FileClock },
] as const;

function ContextPanel({ app }: { app: { name: string; accent: string } }) {
  const [tab, setTab] = useState<(typeof PANEL_TABS)[number]["key"]>("ai");
  return (
    <aside className="hidden w-[340px] flex-none flex-col border-l border-line bg-surface/60 xl:flex">
      <div className="flex flex-none items-center gap-0.5 overflow-x-auto border-b border-line px-2 py-2">
        {PANEL_TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} title={t.label}
              className={cx("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors", on ? "bg-surface-2 text-ink" : "text-muted hover:text-ink")}>
              <Icon size={14} /> <span className="hidden 2xl:inline">{t.label}</span>
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "ai" ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand to-accent-soft text-[11px] text-white"><Sparkles size={13} /></span>
              <p className="font-display text-[14px] font-semibold text-ink">Finance Copilot</p>
            </div>
            <p className="text-[12.5px] leading-relaxed text-muted">Context-aware AI for {app.name}. Ask questions, draft analysis, explain the numbers — wired per studio in Phase 2.</p>
            <div className="mt-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[12px] text-faint">Copilot connects to this studio's data once the studio ships.</div>
          </div>
        ) : (
          <PanelEmpty label={PANEL_TABS.find((t) => t.key === tab)!.label} />
        )}
      </div>
    </aside>
  );
}

function PanelEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-10 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-2 text-faint"><FileClock size={20} /></span>
      <p className="text-[13px] font-semibold text-ink">No {label.toLowerCase()} yet</p>
      <p className="mt-1 max-w-[200px] text-[12px] text-muted">{label} appears here as you work in the studios.</p>
    </div>
  );
}

/* --------------------------------------------------------- top-bar bits */
function TopButton({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} title={label} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.97]">
      {icon}<span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ExportButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} title="Export" className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-2 active:scale-[0.97]">
        <Download size={16} /><span className="hidden sm:inline">Export</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
            <p className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">Export</p>
            {["Excel (.xlsx)", "CSV", "PDF", "PowerPoint (.pptx)"].map((f) => (
              <div key={f} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] text-faint" title="Available once a studio produces output">
                {f}<span className="text-[10px]">—</span>
              </div>
            ))}
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] text-muted">Export activates per studio in Phase 2.</p>
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------- command palette */
function CommandPalette({ onClose, onUpload, router }: { onClose: () => void; onUpload: () => void; router: ReturnType<typeof useRouter> }) {
  const [q, setQ] = useState("");
  const apps = FINANCE_APPS.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));
  const go = (href: string) => { router.push(href); onClose(); };
  return (
    <div className="fixed inset-0 z-[200] grid place-items-start bg-ink/30 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={16} className="text-faint" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jump to a studio or run a command…" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint" />
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-faint">Esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          <p className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">Applications</p>
          {apps.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.slug || "exec"} onClick={() => go(a.href)} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2">
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ background: `${a.accent}1f`, color: a.accent }}><Icon size={15} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-ink">{a.name}</span><span className="block truncate text-[11px] text-muted">{a.desc}</span></span>
              </button>
            );
          })}
          <p className="px-2.5 py-1 pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">Actions</p>
          <button onClick={onUpload} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand/10 text-brand"><Upload size={15} /></span>
            <span className="text-[13px] font-medium text-ink">Upload a file…</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- upload modal */
// Real, working upload. Parses CSV/XLSX in the browser via the shared ingest
// pipeline and pushes the datasets into the shell-wide upload store, so the
// studio you currently have open picks them up immediately.
function UploadModal({ onClose }: { onClose: () => void }) {
  const { datasets, addDatasets } = useFinanceUpload();
  const [over, setOver] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<FileRole>("sales");
  const inputRef = useRef<HTMLInputElement>(null);

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      setErr(null);
      setBusy(true);
      const added: Dataset[] = [];
      for (const f of Array.from(files)) {
        try {
          added.push(await ingestFile(f, role));
        } catch (e) {
          setErr(`${f.name}: ${(e as Error).message}`);
        }
      }
      if (added.length) addDatasets(added);
      setBusy(false);
    },
    [addDatasets, role],
  );

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="font-display text-[15px] font-semibold text-ink">Upload</p>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink"><X size={16} /></button>
        </div>
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <label className="font-mono text-[11px] uppercase tracking-wider text-faint">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as FileRole)}
              className="cursor-pointer rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink outline-none focus:border-brand/40"
            >
              {FILE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <label
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              if (e.dataTransfer.files?.length) ingest(e.dataTransfer.files);
            }}
            className={cx(
              "grid cursor-pointer place-items-center rounded-xl border border-dashed px-6 py-9 text-center transition-colors",
              over ? "border-brand/50 bg-brand/[0.06]" : "border-line-strong bg-surface-2/60 hover:bg-surface-2",
            )}
          >
            <Upload size={22} className="mb-2 text-faint" />
            <p className="text-sm font-medium text-ink">{busy ? "Parsing…" : "Drop a file or click to browse"}</p>
            <p className="mt-0.5 text-[12px] text-faint">Excel · CSV — parsed in your browser, never uploaded</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv"
              multiple
              hidden
              onChange={(e) => e.target.files && ingest(e.target.files)}
            />
          </label>

          {err && <p className="mt-2 text-xs text-rose-600">✕ {err}</p>}

          {datasets.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {datasets.map((d) => (
                <li key={d.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[12px]">
                  <span className="min-w-0 flex-1 truncate text-ink" title={d.name}>{d.name}</span>
                  <span className="font-mono text-[11px] text-faint">{d.table.rows.length} rows</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4"><UploadModeBar /></div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-muted">Files appear in the studio you have open. Data stays temporary until you Save.</p>
            <button onClick={onClose} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
