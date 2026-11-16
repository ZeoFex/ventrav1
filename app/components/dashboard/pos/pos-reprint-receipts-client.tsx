"use client";

import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { SalesReceiptsView } from "@/app/components/dashboard/sales/sales-receipts-view";
import { useSession } from "@/app/components/auth/use-session";
import { canAccess, type PlanId } from "@/config/plan-feature-access";

export function PosReprintReceiptsClient() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground opacity-40" />
      </div>
    );
  }

  const allowed = user
    ? canAccess(
        user.plan as PlanId,
        "reprint-receipts",
        user.subscriptionStatus,
        user.currentPeriodEnd,
      )
    : false;

  if (!allowed) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-[#006c49]/10 dark:bg-[#6ffbbe]/10">
          <Lock className="size-6 text-[#006c49] dark:text-[#6ffbbe]" />
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
            Growth plan required
          </h1>
          <p className="mt-1.5 max-w-md text-[14px] text-muted-foreground">
            Reprint receipts is available on Growth and Pro. Upgrade to search past
            sales and reprint customer receipts.
          </p>
        </div>
        <Link
          href="/settings/billing/upgrade"
          className="inline-flex h-10 items-center rounded-xl bg-[#006c49] px-4 text-[14px] font-semibold text-white hover:bg-[#005a3d] dark:bg-[#6ffbbe] dark:text-[#00382a]"
        >
          View upgrade options
        </Link>
      </div>
    );
  }

  return <SalesReceiptsView />;
}
