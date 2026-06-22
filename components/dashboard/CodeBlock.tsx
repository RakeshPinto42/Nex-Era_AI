"use client";

import { useState } from "react";

export default function CodeBlock({
  code,
  lang = "tsx",
}: {
  code: string;
  lang?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-black/10 bg-neutral-100/80">
      <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
        <span className="font-mono text-xs text-black/45">{lang}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs text-black/50 transition-colors hover:bg-black/5 hover:text-ink"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-black/85">
        <code>{code}</code>
      </pre>
    </div>
  );
}
