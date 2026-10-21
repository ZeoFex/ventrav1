"use client";

import { useCopilot } from "./copilot-context";
import { CopilotMascotAvatar } from "./copilot-mascot-avatar";

export function CopilotSidebarTrigger({ isCollapsed }: { isCollapsed: boolean }) {
  const { toggle, copilotEnabled } = useCopilot();

  if (!copilotEnabled) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-[#bfc9c3]/20 bg-gradient-to-r from-[#006c49]/10 to-transparent px-3 py-2.5 text-left text-[13px] font-medium text-foreground shadow-sm transition-colors hover:border-[#006c49]/35 hover:from-[#006c49]/15 dark:border-white/[0.1] dark:from-[#6ffbbe]/10 dark:hover:border-[#6ffbbe]/30 dark:hover:from-[#6ffbbe]/15 ${
        isCollapsed ? "flex-col gap-1 px-2 py-3" : ""
      }`}
      aria-label="Open Zuri"
      title="Zuri (Ctrl+/)"
    >
      <CopilotMascotAvatar
        size="md"
        className="shrink-0 shadow-sm ring-1 ring-[#006c49]/15 dark:ring-[#6ffbbe]/20"
      />
      {!isCollapsed ? <span className="truncate">Zuri</span> : null}
    </button>
  );
}

/** Mascot button in the mobile top bar. Hidden on desktop and on Starter. */
export function CopilotMobileHeaderButton() {
  const { toggle, copilotEnabled } = useCopilot();

  if (!copilotEnabled) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className="tap-target flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#bfc9c3]/25 bg-[#006c49]/10 lg:hidden dark:border-white/[0.1] dark:bg-[#6ffbbe]/10"
      aria-label="Open Zuri"
      title="Zuri"
      data-tour-target="copilot-mobile"
      data-tour-mount="main"
    >
      <CopilotMascotAvatar size="sm" className="shadow-none ring-0" />
    </button>
  );
}
