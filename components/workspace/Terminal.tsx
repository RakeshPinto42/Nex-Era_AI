"use client";

import { useEffect, useRef } from "react";
import { useWorkspace } from "./store";

export default function Terminal() {
  const { term, folderName } = useWorkspace();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [term]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-black/30">
      <div className="flex flex-none items-center gap-2 border-b border-white/[0.08] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-white/40">
        <span className="h-2 w-2 rounded-full bg-navy" />
        Terminal
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[12.5px] leading-relaxed">
        {term.map((l) => (
          <div key={l.id} className="whitespace-pre-wrap break-words">
            {l.kind === "cmd" ? (
              <span>
                <span className="text-navy">
                  rak@{folderName}
                </span>
                <span className="text-white/40">:~$ </span>
                <span className="text-white">{l.text}</span>
              </span>
            ) : l.kind === "err" ? (
              <span className="text-[#ff8a8a]">{l.text}</span>
            ) : (
              <span className="text-white/65">{l.text}</span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
