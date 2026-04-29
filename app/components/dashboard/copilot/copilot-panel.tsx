"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCopilot } from "./copilot-context";
import { CopilotMascotAvatar } from "./copilot-mascot-avatar";
import { CopilotChat } from "./chat/copilot-chat";
import { CopilotInsightsStrip } from "./insights/copilot-insights-strip";
import { CopilotConfirmDrawer } from "./gates/copilot-confirm-drawer";

export function CopilotPanel() {
  const { open, setOpen, copilotEnabled } = useCopilot();
  const panelRef = useRef<HTMLDivElement>(null);
  /** Pin the drawer to VisualViewport so it stays above the mobile keyboard */
  const [vvBox, setVvBox] = useState<null | { top: number; height: number }>(null);

  useLayoutEffect(() => {
    if (!copilotEnabled || !open) {
      setVvBox(null);
      return;
    }
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) {
      setVvBox(null);
      return;
    }
    const sync = () => {
      const top = vv.offsetTop;
      const innerH = window.innerHeight;
      // Soft keyboard steals most of the screen — rely on vv.height only.
      // Otherwise anchor the drawer flush to the layout viewport bottom so no strip of body/bg shows below.
      const keyboardLikelyOpen = vv.height < innerH * 0.5;
      const height = keyboardLikelyOpen ? vv.height : Math.max(vv.height, innerH - top);
      setVvBox({ top, height });
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [open, copilotEnabled]);

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
        aria-label="Close Copilot"
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in-0"
        onClick={() => setOpen(false)}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copilot-panel-title"
        className={
          vvBox != null
            ? "fixed right-0 top-0 z-[70] flex w-full max-w-lg flex-col border-l border-[#bfc9c3]/15 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right-4 max-lg:max-w-full dark:border-white/[0.08]"
            : "fixed inset-y-0 right-0 z-[70] flex w-full max-w-lg flex-col border-l border-[#bfc9c3]/15 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-right-4 dark:border-white/[0.08]"
        }
        style={{
          ...(vvBox != null
            ? { top: vvBox.top, height: vvBox.height }
            : undefined),
          paddingRight: "max(0px, env(safe-area-inset-right))",
        }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#bfc9c3]/15 bg-surface-card px-4 py-3 dark:border-white/[0.08] dark:bg-[#0a0a0a]">
          <div className="flex min-w-0 items-center gap-3">
            <CopilotMascotAvatar
              size="lg"
              className="shadow-md ring-2 ring-[#006c49]/10 dark:ring-[#6ffbbe]/15"
            />
            <div className="min-w-0">
              <h2
                id="copilot-panel-title"
                className="text-lg font-semibold tracking-tight text-foreground"
              >
                Copilot
              </h2>
              <p className="text-[12px] text-muted-foreground">
                Your Ventra assistant · Gemini, grounded in your data
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
        <div className="flex min-h-0 flex-1 flex-col bg-[#f2f2f7] dark:bg-[#0c0c0e]">
          <CopilotInsightsStrip />
          <CopilotChat />
        </div>
        <CopilotConfirmDrawer />
      </div>
    </>
  );
}
