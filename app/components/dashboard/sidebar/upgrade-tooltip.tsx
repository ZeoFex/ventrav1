"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PlanId, getMinimumPlan } from "@/config/plan-feature-access";

interface UpgradeTooltipProps {
  featureId: string;
  children: React.ReactNode;
}

const PLAN_DISPLAY_NAMES: Record<PlanId, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

export function UpgradeTooltip({ featureId, children }: UpgradeTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const minPlan = getMinimumPlan(featureId);
  const planName = PLAN_DISPLAY_NAMES[minPlan];

  return (
    <div 
      className="relative flex w-full"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div 
        className="flex-1 opacity-70 cursor-not-allowed grayscale-[0.8] w-full"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <div className="relative flex-1 flex items-center w-full">
          {children}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-sm border border-[#e5e7eb] dark:border-white/[0.1] text-muted-foreground/90 shadow-sm">
            <Lock className="size-2.5" />
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-[100] w-[280px] p-4 bg-surface-elevated border border-[#006c49]/20 dark:border-[#6ffbbe]/20 rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-200">
          {/* Caret */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-3 bg-surface-elevated border-t border-l border-[#006c49]/20 dark:border-[#6ffbbe]/20 rotate-45" />
          
          <div className="relative z-10">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#006c49]/10 dark:bg-[#6ffbbe]/10 text-[#006c49] dark:text-[#6ffbbe]">
                <Lock className="size-5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="font-bold text-[14px] leading-tight text-foreground">Premium Feature</p>
                <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                  Upgrade to the <span className="font-semibold text-[#006c49] dark:text-[#6ffbbe]">{planName}</span> plan to unlock this advanced feature.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings/billing"
              className="flex items-center justify-center w-full py-2.5 px-4 text-[13px] font-bold rounded-xl bg-[#006c49] text-white hover:brightness-105 active:scale-[0.98] dark:bg-[#6ffbbe] dark:text-[#003527] transition-all shadow-lg shadow-[#006c49]/20 dark:shadow-[#6ffbbe]/10"
            >
              Upgrade Plan
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
