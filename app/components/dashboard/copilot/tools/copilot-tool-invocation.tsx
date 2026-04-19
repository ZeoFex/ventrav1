"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Wrench, XCircle } from "lucide-react";
import type { ToolRowState } from "../types";

export function CopilotToolInvocation({ tool }: { tool: ToolRowState }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#bfc9c3]/15 bg-surface-elevated/80 text-left dark:border-white/[0.08] dark:bg-[#141414]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
          <Wrench className="size-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 font-medium text-foreground">
          {tool.name.replace(/_/g, " ")}
        </span>
        {tool.status === "running" ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : tool.status === "done" ? (
          <CheckCircle2 className="size-4 shrink-0 text-[#006c49] dark:text-[#6ffbbe]" />
        ) : (
          <XCircle className="size-4 shrink-0 text-red-500" />
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="border-t border-[#bfc9c3]/10 px-3 py-2 font-mono text-[11px] text-muted-foreground dark:border-white/[0.06]">
          {tool.errorText ? (
            <span className="text-red-600 dark:text-red-400">{tool.errorText}</span>
          ) : (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">
              {tool.summary ?? "—"}
            </pre>
          )}
        </div>
      ) : null}
    </div>
  );
}
