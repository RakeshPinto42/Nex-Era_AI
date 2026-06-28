"use client";

/* The block canvas — every interaction is a movable, collapsible, pinnable
   artifact block (not a chat bubble). Prompt → Response → Code → Table → Chart →
   Image → PDF → Tool → Note. Drag to reorder; pin to keep; save code/data out. */

import { useEffect, useMemo, useState } from "react";
import { Reorder, useDragControls, motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import CodeBlock from "@/components/dashboard/CodeBlock";
import { useDashboard } from "@/components/dashboard/store";
import { nexChartSeries } from "@/components/ds/tokens";
import { useStudio, type Block } from "./store";
import { Markdown } from "./Viewers";
import { KindIcon, KIND_COLOR, I } from "./ui";

export function BlockCanvas({ worldId }: { worldId: string }) {
  const { blocksFor, hydrateWorld, reorderWorld, canvasMode } = useStudio();
  const { conversations } = useDashboard();
  const convo = conversations.find((c) => c.id === worldId);

  // Hydrate blocks from the conversation the first time this world opens.
  useEffect(() => {
    if (convo) hydrateWorld(worldId, convo.messages);
  }, [worldId, convo, hydrateWorld]);

  const blocks = blocksFor(worldId);

  if (blocks.length === 0)
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-faint">
        Ask in the terminal below — every answer becomes an interactive block here.
      </div>
    );

  if (canvasMode === "canvas")
    return (
      <div className="mx-auto max-w-6xl columns-1 gap-4 px-5 py-6 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {blocks.map((b) => <BlockCard key={b.id} block={b} />)}
      </div>
    );

  return (
    <Reorder.Group axis="y" values={blocks} onReorder={(next) => reorderWorld(worldId, next.map((b) => b.id))} className="mx-auto max-w-3xl space-y-3 px-5 py-6">
      {blocks.map((b) => <DraggableBlock key={b.id} block={b} />)}
    </Reorder.Group>
  );
}

function DraggableBlock({ block }: { block: Block }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={block} dragListener={false} dragControls={controls} className="list-none">
      <BlockCard block={block} dragControls={controls} />
    </Reorder.Item>
  );
}

/* ----------------------------------------------------------- block shell */

function BlockCard({ block, dragControls }: { block: Block; dragControls?: ReturnType<typeof useDragControls> }) {
  const { toggleCollapse, togglePinBlock, moveBlock, removeBlock } = useStudio();
  const color = KIND_COLOR[block.kind];
  const title = blockTitle(block);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative overflow-hidden rounded-2xl border bg-white/[0.025] backdrop-blur-sm transition-colors ${block.pinned ? "border-amber-300/30 shadow-[0_0_24px_-12px_rgba(252,211,77,0.5)]" : "border-line"}`}
    >
      {/* accent spine */}
      <span className="absolute left-0 top-0 h-full w-0.5" style={{ background: color }} />

      <header className="flex items-center gap-2 px-3 py-2">
        {dragControls && (
          <button
            onPointerDown={(e) => dragControls.start(e)}
            aria-label="Drag to reorder"
            className="cursor-grab text-faint transition-colors hover:text-muted active:cursor-grabbing"
            title="Drag to reorder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" /><circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" /><circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" /></svg>
          </button>
        )}
        <span style={{ color }}><KindIcon kind={block.kind} size={14} /></span>
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{title}</span>

        <div className="flex items-center gap-0.5 text-faint opacity-0 transition-opacity group-hover:opacity-100">
          <IconBtn label="Move up" onClick={() => moveBlock(block.id, -1)}><Chevron up /></IconBtn>
          <IconBtn label="Move down" onClick={() => moveBlock(block.id, 1)}><Chevron /></IconBtn>
          <IconBtn label={block.pinned ? "Unpin" : "Pin to artifacts"} active={block.pinned} onClick={() => togglePinBlock(block.id)}>{I.pin}</IconBtn>
          <IconBtn label={block.collapsed ? "Expand" : "Collapse"} onClick={() => toggleCollapse(block.id)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: block.collapsed ? "rotate(-90deg)" : "none" }}><path d="m6 9 6 6 6-6" /></svg>
          </IconBtn>
          <IconBtn label="Delete block" onClick={() => removeBlock(block.id)}>{I.close}</IconBtn>
        </div>
      </header>

      {!block.collapsed && <div className="px-3 pb-3">{<BlockBody block={block} />}</div>}
    </motion.div>
  );
}

/* ------------------------------------------------------------ block body */

function BlockBody({ block }: { block: Block }) {
  const { files, addArtifact, openTab, addBlock } = useStudio();

  switch (block.kind) {
    case "prompt":
      return <p className="rounded-xl bg-surface-2 px-3 py-2 text-[15px] leading-relaxed text-ink">{block.text}</p>;

    case "response":
    case "note":
      return (
        <div>
          {block.streaming && !block.text ? (
            <span className="text-sm text-muted">Thinking…</span>
          ) : (
            <Markdown text={block.text ?? ""} />
          )}
          {block.streaming && <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-blink bg-brand" />}
        </div>
      );

    case "code":
      return (
        <div>
          <CodeBlock code={block.code ?? ""} lang={block.lang ?? "code"} />
          <button
            onClick={() => { addArtifact({ title: `Code · ${block.lang ?? ""}`, kind: "code", lang: block.lang, content: block.code ?? "" }); }}
            className="mt-1 text-[11px] text-faint hover:text-ink"
          >
            ＋ Save to artifacts
          </button>
        </div>
      );

    case "table":
      return <TableBody rows={block.rows ?? []} onChart={() => addBlock({ worldId: block.worldId, kind: "chart", rows: block.rows, chartType: "bar" })} />;

    case "chart":
      return <ChartBody rows={block.rows ?? []} type={block.chartType ?? "bar"} />;

    case "image": {
      const f = files.find((x) => x.id === block.fileId);
      return f?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.url} alt={f.name} className="max-h-80 rounded-lg object-contain" />
      ) : <Muted>Image unavailable</Muted>;
    }
    case "pdf": {
      const f = files.find((x) => x.id === block.fileId);
      return f?.url ? (
        <object data={f.url} type="application/pdf" className="h-72 w-full rounded-lg" />
      ) : <Muted>PDF unavailable</Muted>;
    }
    case "file": {
      const f = files.find((x) => x.id === block.fileId);
      return (
        <button onClick={() => f && openTab({ kind: f.kind, title: f.name, fileId: f.id })} className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink hover:bg-surface-2">
          {f ? <><span style={{ color: KIND_COLOR[f.kind] }}><KindIcon kind={f.kind} size={16} /></span>{f.name} <span className="text-faint">· open</span></> : "File closed"}
        </button>
      );
    }
    case "tool":
      return (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px]">
          <span className={`h-1.5 w-1.5 rounded-full ${block.tool?.status === "running" ? "animate-pulse bg-warning" : block.tool?.status === "error" ? "bg-danger" : "bg-success"}`} />
          <span className="text-ink">{block.tool?.name}</span>
          {block.tool?.detail && <span className="ml-auto font-mono text-[11px] text-faint">{block.tool.detail}</span>}
        </div>
      );
    default:
      return null;
  }
}

function TableBody({ rows, onChart }: { rows: string[][]; onChart: () => void }) {
  if (!rows.length) return <Muted>Empty table</Muted>;
  const head = rows[0];
  const body = rows.slice(1);
  const numeric = head.some((_, j) => body.length && body.every((r) => r[j] === "" || !isNaN(Number(r[j]?.replace(/[, %]/g, "")))) && body.some((r) => r[j]));
  return (
    <div>
      <div className="max-h-72 overflow-auto rounded-lg border border-line">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0"><tr>{head.map((c, j) => <th key={j} className="border-b border-line bg-surface px-3 py-1.5 text-left font-semibold text-ink">{c}</th>)}</tr></thead>
          <tbody>{body.map((r, i) => <tr key={i} className="odd:bg-surface-2/60">{head.map((_, j) => <td key={j} className="border-b border-line px-3 py-1.5 text-ink">{r[j] ?? ""}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {numeric && body.length > 1 && (
        <button onClick={onChart} className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted hover:text-ink">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M7 14l3-3 3 3 5-6" /></svg>
          Visualize as chart
        </button>
      )}
    </div>
  );
}

function ChartBody({ rows, type }: { rows: string[][]; type: "bar" | "line" }) {
  const [kind, setKind] = useState<"bar" | "line">(type);
  const { data, series } = useMemo(() => parseChart(rows), [rows]);
  if (!data.length) return <Muted>No chartable data</Muted>;
  const Chart = kind === "bar" ? BarChart : LineChart;
  return (
    <div>
      <div className="mb-2 flex gap-1">
        {(["bar", "line"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${kind === k ? "bg-surface-3 text-ink" : "text-faint hover:text-ink"}`}>{k}</button>
        ))}
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#8b93b8", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
            <YAxis tick={{ fill: "#8b93b8", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip contentStyle={{ background: "#0e1118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "#fff" }} />
            {series.map((s, i) =>
              kind === "bar"
                ? <Bar key={s} dataKey={s} fill={nexChartSeries[i % nexChartSeries.length]} radius={[4, 4, 0, 0]} />
                : <Line key={s} type="monotone" dataKey={s} stroke={nexChartSeries[i % nexChartSeries.length]} strokeWidth={2} dot={false} />,
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function parseChart(rows: string[][]): { data: Record<string, string | number>[]; series: string[] } {
  if (rows.length < 2) return { data: [], series: [] };
  const head = rows[0];
  const body = rows.slice(1);
  const num = (v: string) => Number((v ?? "").replace(/[, %$]/g, ""));
  const series = head.slice(1).filter((_, j) => body.some((r) => r[j + 1] !== "" && !isNaN(num(r[j + 1]))));
  const data = body.map((r) => {
    const o: Record<string, string | number> = { name: r[0] };
    head.slice(1).forEach((h, j) => { if (series.includes(h)) o[h] = num(r[j + 1]); });
    return o;
  });
  return { data, series };
}

/* ----------------------------------------------------------- small bits */

function blockTitle(b: Block): string {
  switch (b.kind) {
    case "prompt": return "Prompt";
    case "response": return b.model ?? "AI Response";
    case "code": return `Code · ${b.lang ?? ""}`;
    case "table": return "Table";
    case "chart": return "Chart";
    case "image": return "Image";
    case "pdf": return "PDF";
    case "file": return "File";
    case "tool": return `Tool · ${b.tool?.name ?? ""}`;
    case "note": return "Note";
    default: return "Block";
  }
}

function IconBtn({ children, label, onClick, active }: { children: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`grid h-6 w-6 place-items-center rounded transition-colors hover:bg-surface-3 hover:text-ink ${active ? "text-amber-300" : ""}`}>
      {children}
    </button>
  );
}
function Chevron({ up }: { up?: boolean }) {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? "rotate(180deg)" : "none" }}><path d="m6 9 6 6 6-6" /></svg>;
}
function Muted({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-faint">{children}</p>;
}
