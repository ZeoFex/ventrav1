"use client";

import { COPILOT_FEATURE_ID } from "@/config/plan-feature-access";
import { UpgradeTooltip } from "@/app/components/dashboard/sidebar/upgrade-tooltip";
import { useCopilot } from "./copilot-context";
import { CopilotMascotAvatar } from "./copilot-mascot-avatar";

export function CopilotSidebarTrigger({ isCollapsed }: { isCollapsed: boolean }) {
  const { toggle, copilotEnabled } = useCopilot();

  const button = (
    <button
      type="button"
      onClick={copilotEnabled ? toggle : undefined}
      disabled={!copilotEnabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl border border-[#bfc9c3]/20 bg-gradient-to-r from-[#006c49]/10 to-transparent px-3 py-2.5 text-left text-[13px] font-medium text-foreground shadow-sm transition-colors hover:border-[#006c49]/35 hover:from-[#006c49]/15 dark:border-white/[0.1] dark:from-[#6ffbbe]/10 dark:hover:border-[#6ffbbe]/30 dark:hover:from-[#6ffbbe]/15 ${
        isCollapsed ? "flex-col gap-1 px-2 py-3" : ""
      } ${!copilotEnabled ? "cursor-not-allowed opacity-70" : ""}`}
      aria-label={copilotEnabled ? "Open Copilot" : "Copilot (Pro plan)"}
      title={
        copilotEnabled ? "Copilot (Ctrl+/)" : "Upgrade to Pro to use Copilot"
      }
    >
      <CopilotMascotAvatar
        size="md"
        className="shrink-0 shadow-sm ring-1 ring-[#006c49]/15 dark:ring-[#6ffbbe]/20"
      />
      {!isCollapsed ? <span className="truncate">Copilot</span> : null}
    </button>
  );

  if (!copilotEnabled) {
    return (
      <UpgradeTooltip featureId={COPILOT_FEATURE_ID}>{button}</UpgradeTooltip>
    );
  }

  return button;
}
