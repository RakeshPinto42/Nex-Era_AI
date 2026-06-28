"use client";

/* Finance OS upload mode control (privacy-first). Three options on every upload;
   **Analyze Only is the default** — temporary, never stored unless the user
   explicitly Saves. See FINANCE_OS_PRIVACY.md. Phase 1 = the control + default;
   per-studio processing is wired in Phase 2. */

import { useState } from "react";
import { Sparkles, Save, Download } from "lucide-react";
import { cx } from "@/components/uikit";

export type UploadMode = "analyze" | "save" | "download";

const OPTIONS: { key: UploadMode; label: string; hint: string; icon: typeof Sparkles; star?: boolean }[] = [
  { key: "analyze", label: "Analyze Only", hint: "Temporary · cleared after the session. No server storage.", icon: Sparkles, star: true },
  { key: "save", label: "Save Workspace", hint: "Persist into your own workspace (explicit).", icon: Save },
  { key: "download", label: "Download", hint: "Export results — Excel · CSV · PDF · PPTX.", icon: Download },
];

export function UploadModeBar({ value, onChange }: { value?: UploadMode; onChange?: (m: UploadMode) => void }) {
  const [internal, setInternal] = useState<UploadMode>("analyze"); // default ⭐
  const mode = value ?? internal;
  const set = (m: UploadMode) => { setInternal(m); onChange?.(m); };
  const active = OPTIONS.find((o) => o.key === mode)!;
  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-surface-2 p-1">
        {OPTIONS.map((o) => {
          const Icon = o.icon;
          const on = mode === o.key;
          return (
            <button
              key={o.key}
              onClick={() => set(o.key)}
              aria-pressed={on}
              className={cx(
                "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-center transition-all",
                on ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink",
              )}
            >
              <span className={cx("flex items-center gap-1 text-[12px] font-semibold", on && o.key === "analyze" && "text-brand")}>
                <Icon size={13} /> {o.label} {o.star && <span title="Default">⭐</span>}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11.5px] text-muted">{active.hint}</p>
    </div>
  );
}
