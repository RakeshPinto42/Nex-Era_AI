"use client";

/* Research Hub views — left rail, center canvas (summary + citations + sources +
   timeline / mind map / compare) and right rail (reasoning / quality / confidence
   / export / notes). Presentational; reads the research store, calls back to the
   Hub for run / save / export. Nex-Era tailwind tokens (obsidian/brand/violet). */

import { useState } from "react";
import { useDashboard } from "@/components/dashboard/store";
import { useResearch, type Research, type Source, type View } from "./store";
import { safeHref } from "@/lib/security/url";

const MODE_LABEL: Record<string, string> = { web: "Web", pdf: "PDF", youtube: "YouTube", website: "Website" };

function rel(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ---- citation-aware markdown (light) ---- */
function CiteText({ text, sources }: { text: string; sources: Source[] }) {
  const lines = text.split("\n");
  const out: JSX.Element[] = [];
  let list: string[] = [];
  const flush = (k: number) => {
    if (!list.length) return;
    out.push(<ul key={`u${k}`} className="my-1.5 list-disc space-y-1 pl-5 marker:text-faint">{list.map((it, j) => <li key={j}>{inline(it, sources)}</li>)}</ul>);
    list = [];
  };
  lines.forEach((ln, i) => {
    const h = /^(#{1,4})\s+(.*)$/.exec(ln);
    const b = /^\s*[-*]\s+(.*)$/.exec(ln);
    if (b) { list.push(b[1]); return; }
    flush(i);
    if (h) out.push(<p key={i} className="mb-1 mt-3 text-[15px] font-semibold text-ink first:mt-0">{inline(h[2], sources)}</p>);
    else if (ln.trim()) out.push(<p key={i} className="mt-2 leading-relaxed text-ink first:mt-0">{inline(ln, sources)}</p>);
  });
  flush(999);
  return <div className="text-[15px]">{out}</div>;
}
function inline(text: string, sources: Source[]) {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/).map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) return <strong key={i} className="font-semibold text-ink">{seg.slice(2, -2)}</strong>;
    const c = /^\[(\d+)\]$/.exec(seg);
    if (c) {
      const src = sources[Number(c[1]) - 1];
      return src ? (
        <a key={i} href={safeHref(src.url)} target="_blank" rel="noopener noreferrer" title={src.title} className="mx-0.5 rounded bg-brand/20 px-1 align-super text-[10px] font-semibold text-brand hover:bg-brand/30">{c[1]}</a>
      ) : <span key={i}>{seg}</span>;
    }
    return <span key={i}>{seg}</span>;
  });
}

/* ============================================================ LEFT */

export function LeftPanel() {
  const { history, collections, activeId, open, remove, newCollection } = useResearch();
  const { conversations } = useDashboard();
  const [coll, setColl] = useState("");

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 text-sm">
      <Label>Research History</Label>
      {history.length === 0 && <Empty>Run a query to start.</Empty>}
      <div className="mb-4 space-y-0.5">
        {history.map((r) => (
          <div key={r.id} className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 ${r.id === activeId ? "bg-brand/[0.12]" : "hover:bg-surface-2"}`}>
            <button onClick={() => open(r.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="rounded bg-surface-3 px-1 font-mono text-[9px] uppercase text-muted">{MODE_LABEL[r.mode]}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.title}</span>
            </button>
            <button onClick={() => remove(r.id)} aria-label="Delete" className="text-faint opacity-0 transition hover:text-ink group-hover:opacity-100">✕</button>
          </div>
        ))}
      </div>

      <Label>Saved Collections</Label>
      <div className="mb-2 flex gap-1.5">
        <input value={coll} onChange={(e) => setColl(e.target.value)} placeholder="New collection" className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-2 py-1 text-xs text-ink placeholder:text-faint outline-none focus:border-brand/40" />
        <button onClick={() => { newCollection(coll); setColl(""); }} className="rounded-lg bg-surface-3 px-2 text-ink hover:bg-surface-2">+</button>
      </div>
      <div className="mb-4 space-y-0.5">
        {collections.length === 0 ? <Empty>No collections.</Empty> : collections.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] text-ink hover:bg-surface-2">
            <span className="truncate">📁 {c.name}</span><span className="font-mono text-[10px] text-faint">{c.researchIds.length}</span>
          </div>
        ))}
      </div>

      <Label>Worlds</Label>
      <div className="space-y-0.5">
        {conversations.filter((c) => c.messages.length).slice(0, 8).map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] text-muted">
            <span className="text-violet">◆</span><span className="min-w-0 flex-1 truncate">{c.title}</span>
          </div>
        ))}
        {!conversations.some((c) => c.messages.length) && <Empty>Saved research appears here.</Empty>}
      </div>
    </div>
  );
}

/* ============================================================ CENTER */

export function Canvas() {
  const { active, view, setView, compareSel, toggleCompare } = useResearch();
  if (!active)
    return (
      <div className="grid h-full place-items-center px-6 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand/25 to-violet/25 text-2xl">🔬</div>
          <h2 className="text-xl font-semibold text-ink">AI Research OS</h2>
          <p className="mt-2 text-sm text-muted">Search the web, drop a PDF, paste a YouTube link or a URL. Sources, a cited summary, timeline and comparisons build below — then save the finding into a World.</p>
        </div>
      </div>
    );

  const VIEWS: { id: View; label: string }[] = [
    { id: "canvas", label: "Canvas" }, { id: "timeline", label: "Timeline" }, { id: "mindmap", label: "Mind Map" }, { id: "compare", label: "Compare" },
  ];

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-lg font-semibold text-ink">{active.title}</h1>
          <div className="flex flex-none gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${view === v.id ? "bg-surface-3 text-ink" : "text-faint hover:text-ink"}`}>{v.label}</button>
            ))}
          </div>
        </div>

        {view === "canvas" && <CanvasView r={active} compareSel={compareSel} toggleCompare={toggleCompare} />}
        {view === "timeline" && <Timeline r={active} />}
        {view === "mindmap" && <MindMap r={active} />}
        {view === "compare" && <Compare r={active} sel={compareSel} />}
      </div>
    </div>
  );
}

function CanvasView({ r, compareSel, toggleCompare }: { r: Research; compareSel: number[]; toggleCompare: (id: number) => void }) {
  return (
    <div className="space-y-4">
      {/* AI summary */}
      <section className="rounded-2xl border border-line bg-white/[0.025] p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand">AI Summary</span>
          {r.model && <span className="font-mono text-[10px] text-faint">· {r.model}</span>}
        </div>
        {r.streaming && !r.summary ? <Thinking /> : r.summary ? <CiteText text={r.summary} sources={r.sources} /> : <p className="text-sm text-faint">Gathering sources…</p>}
        {r.streaming && <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-brand" />}
      </section>

      {/* sources */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">Sources · {r.sources.length}</span>
          {compareSel.length > 0 && <span className="text-[11px] text-violet">{compareSel.length}/2 selected to compare</span>}
        </div>
        <div className="space-y-2">
          {r.sources.map((s) => (
            <div key={s.id} className="group flex gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-brand/15 font-mono text-[11px] font-bold text-brand">{s.id}</span>
              <div className="min-w-0 flex-1">
                <a href={safeHref(s.url)} target="_blank" rel="noopener noreferrer" className="block truncate text-[14px] font-medium text-ink hover:text-brand">{s.title}</a>
                <p className="truncate font-mono text-[10px] text-faint">{s.url}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted">{s.content}</p>
              </div>
              <div className="flex flex-none flex-col items-end gap-1.5">
                <QualityPill q={s.quality} />
                <label className="flex cursor-pointer items-center gap-1 text-[10px] text-faint">
                  <input type="checkbox" checked={compareSel.includes(s.id)} onChange={() => toggleCompare(s.id)} className="accent-violet" /> compare
                </label>
              </div>
            </div>
          ))}
          {r.sources.length === 0 && !r.streaming && <Empty>No sources found.</Empty>}
        </div>
      </section>
    </div>
  );
}

export function Timeline({ r }: { r: Research }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-4">
      <ol className="relative ml-1">
        {r.events.map((e, i) => (
          <li key={i} className="flex gap-3 pb-4 last:pb-0">
            <div className="relative flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-brand shadow-[0_0_8px_#3b82f6]" />
              {i < r.events.length - 1 && <span className="mt-1 w-px flex-1 bg-surface-3" />}
            </div>
            <div className="flex-1 pb-1"><p className="text-sm text-ink">{e.label}</p><p className="font-mono text-[11px] text-faint">{new Date(e.ts).toLocaleTimeString()}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MindMap({ r }: { r: Research }) {
  // Lightweight radial map: central topic → source nodes (colored by quality).
  const nodes = r.sources.slice(0, 8);
  const R = 150, cx = 200, cy = 175;
  return (
    <div className="grid place-items-center rounded-2xl border border-line bg-surface-2 p-4">
      <svg viewBox="0 0 400 350" className="h-[350px] w-full max-w-xl">
        {nodes.map((s, i) => {
          const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          const col = s.quality >= 85 ? "#34f5a0" : s.quality >= 68 ? "#3b82f6" : "#fbbf24";
          return (
            <g key={s.id}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.12)" />
              <circle cx={x} cy={y} r="6" fill={col} />
              <text x={x} y={y - 10} fill="#b4bce0" fontSize="9" textAnchor="middle">{(s.title || s.url).slice(0, 22)}</text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r="34" fill="url(#g)" />
        <defs><radialGradient id="g"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#3b82f6" /></radialGradient></defs>
        <text x={cx} y={cy + 3} fill="#fff" fontSize="10" textAnchor="middle" fontWeight="600">{r.mode.toUpperCase()}</text>
      </svg>
      <p className="text-[11px] text-faint">Topic → {nodes.length} sources · node color = source quality</p>
    </div>
  );
}

export function Compare({ r, sel }: { r: Research; sel: number[] }) {
  const picked = sel.map((id) => r.sources.find((s) => s.id === id)).filter(Boolean) as Source[];
  if (picked.length < 2) return <Empty>Select two sources (☑ compare) in Canvas view to compare them side by side.</Empty>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {picked.map((s) => (
        <div key={s.id} className="rounded-xl border border-line bg-surface-2 p-3">
          <a href={safeHref(s.url)} target="_blank" rel="noopener noreferrer" className="block truncate text-[13px] font-medium text-ink hover:text-brand">[{s.id}] {s.title}</a>
          <div className="mt-1 mb-2"><QualityPill q={s.quality} /></div>
          <p className="max-h-72 overflow-y-auto text-[12px] leading-relaxed text-muted">{s.content.slice(0, 1500)}</p>
        </div>
      ))}
    </div>
  );
}

/* ============================================================ RIGHT */

export function RightPanel({ onExportMd, onExportPdf, onSaveWorld }: { onExportMd: () => void; onExportPdf: () => void; onSaveWorld: () => void }) {
  const { active, update } = useResearch();
  if (!active) return <div className="grid h-full place-items-center px-4 text-center text-sm text-faint">Run research to see reasoning, quality & export.</div>;
  const conf = active.confidence;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <Panel title="AI Reasoning">
        <Row k="Mode" v={MODE_LABEL[active.mode]} />
        <Row k="Sources" v={String(active.sources.length)} />
        {active.model && <Row k="Model" v={active.model} />}
        <Row k="Citations" v={String((active.summary.match(/\[\d+\]/g) ?? []).length)} />
      </Panel>

      <Panel title="Confidence Score">
        {conf == null ? <Empty>Pending summary.</Empty> : (
          <div>
            <div className="flex items-end justify-between"><span className={`text-2xl font-semibold ${conf >= 75 ? "text-success" : conf >= 55 ? "text-warning" : "text-danger"}`}>{conf}</span><span className="font-mono text-[10px] text-faint">/ 100</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full bg-gradient-to-r from-brand to-violet" style={{ width: `${conf}%` }} /></div>
            <p className="mt-2 text-[11px] text-faint">Heuristic: source quality × breadth × citation density. Not a guarantee — verify primary sources.</p>
          </div>
        )}
      </Panel>

      <Panel title="Source Quality">
        {active.sources.length === 0 ? <Empty>No sources.</Empty> : (
          <div className="space-y-1.5">
            {active.sources.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-4 font-mono text-[10px] text-faint">{s.id}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"><div className="h-full rounded-full" style={{ width: `${s.quality}%`, background: s.quality >= 85 ? "#34f5a0" : s.quality >= 68 ? "#3b82f6" : "#fbbf24" }} /></div>
                <span className="w-7 text-right font-mono text-[10px] text-muted">{s.quality}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Export & Save">
        <div className="flex flex-wrap gap-2">
          <button onClick={onSaveWorld} disabled={!active.summary} className="flex-1 rounded-lg bg-gradient-to-r from-brand to-violet px-2 py-1.5 text-[12px] font-semibold text-ink disabled:opacity-40">{active.savedWorldId ? "✓ Saved to World" : "Save to World"}</button>
          <button onClick={onExportMd} disabled={!active.summary} className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-ink hover:bg-surface-2 disabled:opacity-40">.md</button>
          <button onClick={onExportPdf} disabled={!active.summary} className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] text-ink hover:bg-surface-2 disabled:opacity-40">.pdf</button>
        </div>
      </Panel>

      <Panel title="Notes">
        <textarea value={active.notes} onChange={(e) => update(active.id, { notes: e.target.value })} placeholder="Your notes on this research…" rows={5} className="w-full resize-none rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[13px] text-ink placeholder:text-faint outline-none focus:border-brand/40" />
      </Panel>
    </div>
  );
}

/* ---- bits ---- */
function QualityPill({ q }: { q: number }) {
  const c = q >= 85 ? "text-success bg-success/10" : q >= 68 ? "text-brand bg-brand/10" : "text-warning bg-warning/10";
  const label = q >= 85 ? "High" : q >= 68 ? "Good" : "Mixed";
  return <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase ${c}`}>{label} {q}</span>;
}
function Thinking() { return <p className="text-sm text-muted">Reading sources & synthesizing…</p>; }
function Label({ children }: { children: React.ReactNode }) { return <p className="px-1 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{children}</p>; }
function Empty({ children }: { children: React.ReactNode }) { return <p className="px-1 py-2 text-[12px] text-faint">{children}</p>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border border-line bg-white/[0.025] p-3"><p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{title}</p>{children}</div>;
}
function Row({ k, v }: { k: string; v: string }) { return <div className="flex items-center justify-between gap-3 py-0.5 text-[13px]"><span className="text-muted">{k}</span><span className="truncate font-medium text-ink">{v}</span></div>; }
