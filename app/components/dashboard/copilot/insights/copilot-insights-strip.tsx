"use client";

import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
type CopilotInsight = {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warning" | "positive";
};

const STORAGE_PREFIX = "ventra_zuri_insights_dismissed:";

export function CopilotInsightsStrip() {
  const [insights, setInsights] = useState<CopilotInsight[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/copilot/insights");
        if (!res.ok) return;
        const data = (await res.json()) as { insights: CopilotInsight[] };
        if (!cancelled) setInsights(data.insights ?? []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        setDismissed(new Set(arr));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_PREFIX, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const visible = insights.filter((i) => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-[#bfc9c3]/15 px-3 py-3 dark:border-white/[0.08]">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3.5 text-[#006c49] dark:text-[#6ffbbe]" aria-hidden />
        Insights
      </div>
      <ul className="space-y-2">
        {visible.map((i) => (
          <li
            key={i.id}
            className="flex gap-2 rounded-xl border border-[#bfc9c3]/12 bg-surface-elevated/90 p-2.5 text-[13px] dark:border-white/[0.06] dark:bg-[#141414]"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{i.title}</p>
              <p className="mt-0.5 text-muted-foreground">{i.body}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(i.id)}
              className="tap-target flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              aria-label="Dismiss insight"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
