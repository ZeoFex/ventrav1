"use client";

import { Sparkles } from "lucide-react";
import { COPILOT_FEATURE_ID } from "@/config/plan-feature-access";
import { UpgradeTooltip } from "@/app/components/dashboard/sidebar/upgrade-tooltip";
import { useCopilot } from "./copilot-context";
import { cn } from "@/lib/utils";

/**
 * Floating Copilot entry for small screens (sidebar trigger is easy to miss on mobile).
 * Placed bottom-left so it does not overlap the quick cart FAB (bottom-right).
 */
export function CopilotMobileFab() {
  const { toggle, copilotEnabled } = useCopilot();

  const button = (
    <button
      type="button"
      onClick={copilotEnabled ? toggle : undefined}
      disabled={!copilotEnabled}
      className={cn(
        "fixed z-[55] flex size-14 items-center justify-center rounded-full border border-[#bfc9c3]/25 bg-gradient-to-br from-[#006c49] to-[#003527] text-white shadow-lg transition-transform",
        "bottom-[max(1rem,env(safe-area-inset-bottom))] left-4",
        "hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6ffbbe] focus-visible:ring-offset-2",
        "dark:border-white/10 dark:from-[#6ffbbe]/90 dark:to-[#006c49] dark:text-[#0a0a0a]",
        !copilotEnabled && "cursor-not-allowed opacity-75",
      )}
      aria-label={copilotEnabled ? "Open Copilot" : "Copilot (Pro plan)"}
      title={
        copilotEnabled ? "Copilot (Ctrl+/)" : "Upgrade to Pro to use Copilot"
      }
    >
      <Sparkles className="size-7" strokeWidth={1.75} aria-hidden />
    </button>
  );

  if (!copilotEnabled) {
    return (
      <div className="lg:hidden">
        <UpgradeTooltip featureId={COPILOT_FEATURE_ID}>{button}</UpgradeTooltip>
      </div>
    );
  }

  return <div className="lg:hidden">{button}</div>;
}
