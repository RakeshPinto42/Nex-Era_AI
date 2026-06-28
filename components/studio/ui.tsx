"use client";

/* Shared Studio primitives: HUD framing, icons, content-kind glyphs/colors. */

import type { ContentKind, BlockKind } from "./store";

type AnyKind = ContentKind | BlockKind;

const sw = {
  strokeWidth: 1.7,
  stroke: "currentColor",
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Sci-fi HUD corner brackets — the reference's panel framing, in DS tokens. */
export function HudCorners({ color = "rgba(59,130,246,0.45)" }: { color?: string }) {
  const c = "pointer-events-none absolute h-3 w-3 border-brand/0";
  return (
    <>
      <span className={`${c} left-0 top-0 border-l border-t`} style={{ borderColor: color }} />
      <span className={`${c} right-0 top-0 border-r border-t`} style={{ borderColor: color }} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} style={{ borderColor: color }} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} style={{ borderColor: color }} />
    </>
  );
}

export const KIND_COLOR: Record<AnyKind, string> = {
  chat: "#8b5cf6",
  image: "#ec4899",
  pdf: "#fb7185",
  sheet: "#34f5a0",
  doc: "#60a5fa",
  code: "#3b82f6",
  text: "#94a3b8",
  video: "#f59e0b",
  audio: "#22d3ee",
  artifact: "#a855f7",
  other: "#64748b",
  // block kinds
  prompt: "#8b93b8",
  response: "#a855f7",
  table: "#34f5a0",
  chart: "#22d3ee",
  tool: "#fbbf24",
  note: "#60a5fa",
  file: "#94a3b8",
};

export function KindIcon({ kind, size = 16 }: { kind: AnyKind; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", ...sw };
  switch (kind) {
    case "prompt":
      return <svg {...p}><path d="M4 6h16M4 12h10M4 18h7" /></svg>;
    case "response":
      return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="3" /></svg>;
    case "table":
      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>;
    case "chart":
      return <svg {...p}><path d="M3 3v18h18M7 14l3-3 3 3 5-6" /></svg>;
    case "tool":
      return <svg {...p}><path d="M14.7 6.3a4 4 0 0 1-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5z" /></svg>;
    case "note":
      return <svg {...p}><path d="M4 4h16v12l-4 4H4z" /><path d="M16 20v-4h4M8 9h8M8 13h5" /></svg>;
    case "chat":
      return <svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "image":
      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>;
    case "pdf":
      return <svg {...p}><path d="M14 3v5h5M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6M9 17h4" /></svg>;
    case "sheet":
      return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>;
    case "doc":
      return <svg {...p}><path d="M14 3v5h5M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M8 13h8M8 17h6" /></svg>;
    case "code":
      return <svg {...p}><path d="m8 9-3 3 3 3M16 9l3 3-3 3M13 6l-2 12" /></svg>;
    case "video":
      return <svg {...p}><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m22 8-6 4 6 4z" /></svg>;
    case "audio":
      return <svg {...p}><path d="M3 10v4M7 7v10M11 4v16M15 8v8M19 11v2" /></svg>;
    case "artifact":
      return <svg {...p}><path d="M12 2 4 7v10l8 5 8-5V7z" /><path d="m4 7 8 5 8-5M12 22V12" /></svg>;
    default:
      return <svg {...p}><path d="M14 3v5h5M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>;
  }
}

export const I = {
  close: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...sw}><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  split: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...sw}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /></svg>
  ),
  attach: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}><path d="m21.4 11.05-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.33 3.33 0 1 1 4.71 4.71L9.84 17.9a1.67 1.67 0 0 1-2.36-2.36l8.49-8.48" /></svg>
  ),
  mic: (
    <svg width="18" height="18" viewBox="0 0 24 24" {...sw}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...sw} strokeWidth={2}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
  ),
  stop: <span className="h-3 w-3 rounded-[3px] bg-white" aria-hidden />,
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...sw}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  pin: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...sw}><path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" /></svg>
  ),
  panelLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...sw}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
  ),
  panelRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" {...sw}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>
  ),
};
