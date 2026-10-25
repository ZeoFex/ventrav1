"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useCopilot } from "./copilot-context";
import { CopilotMascotAvatar } from "./copilot-mascot-avatar";
import { CopilotChat } from "./chat/copilot-chat";
import { CopilotInsightsStrip } from "./insights/copilot-insights-strip";
import { CopilotConfirmDrawer } from "./gates/copilot-confirm-drawer";

export function CopilotPanel() {
  const { open, setOpen, copilotEnabled } = useCopilot();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!copilotEnabled || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 0);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
    };
  }, [open, copilotEnabled]);

  useEffect(() => {
    if (!copilotEnabled || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, copilotEnabled]);

  if (!copilotEnabled || !open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close Zuri"
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in-0"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-panel-title"
        className="fixed z-[70] flex flex-col bg-surface-card shadow-2xl dark:bg-[#0a0a0a] max-lg:inset-x-3 max-lg:bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:h-[min(70dvh,34rem)] max-lg:overflow-hidden max-lg:rounded-[1.75rem] max-lg:border max-lg:border-[#bfc9c3]/20 motion-safe:max-lg:animate-in motion-safe:max-lg:slide-in-from-bottom-4 dark:max-lg:border-white/[0.1] lg:inset-y-0 lg:right-0 lg:w-full lg:max-w-lg lg:border-l lg:border-[#bfc9c3]/15 motion-safe:lg:animate-in motion-safe:lg:slide-in-from-right-4 dark:lg:border-white/[0.08]"
        style={{
          paddingRight: "max(0px, env(safe-area-inset-right))",
        }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#bfc9c3]/15 px-3 py-2.5 dark:border-white/[0.08] lg:px-4 lg:py-3">
          <div className="flex min-w-0 items-center gap-2.5 lg:gap-3">
            <CopilotMascotAvatar
              size="md"
              className="shadow-md ring-2 ring-[#006c49]/10 dark:ring-[#6ffbbe]/15 lg:size-12"
            />
            <div className="min-w-0">
              <h2
                id="copilot-panel-title"
                className="text-[16px] font-semibold tracking-tight text-foreground lg:text-lg"
              >
                Zuri
              </h2>
              <p className="truncate text-[12px] text-muted-foreground">
                Store assistant
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="tap-target flex size-10 items-center justify-center rounded-xl border border-[#bfc9c3]/20 text-muted-foreground hover:bg-surface-elevated hover:text-foreground dark:border-white/[0.1]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </header>
        <CopilotInsightsStrip />
        <CopilotChat />
        <CopilotConfirmDrawer />
      </div>
    </>
  );
}
