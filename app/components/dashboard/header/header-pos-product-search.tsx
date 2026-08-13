"use client";

import { ScanLine } from "lucide-react";
import { useSession } from "../../auth/use-session";
import { UpgradeTooltip } from "../sidebar/upgrade-tooltip";
import { canAccess } from "@/config/plan-feature-access";
import { usePosProductSearch } from "../pos/pos-product-search-context";
import { PosCategorySearchMorph } from "../pos/sale/pos-category-search-morph";

export function HeaderPosProductSearch() {
  const { searchQuery, setSearchQuery, openScan } = usePosProductSearch();
  const { user } = useSession();
  const plan = user?.plan || "starter";
  const hasScanAccess = canAccess(
    plan,
    "pos-scan",
    user?.subscriptionStatus,
    user?.currentPeriodEnd,
  );

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <PosCategorySearchMorph value={searchQuery} onChange={setSearchQuery} />
      </div>
      {hasScanAccess ? (
        <button
          type="button"
          onClick={openScan}
          className="tap-target inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-muted-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-all hover:border-[#006c49]/40 hover:bg-surface-elevated hover:text-foreground dark:border-white/[0.1] dark:bg-[#141414] dark:shadow-none dark:hover:border-[#6ffbbe]/35"
          aria-label="Scan barcode"
          title="Scan"
        >
          <ScanLine className="size-[1.125rem] text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={1.75} />
        </button>
      ) : (
        <UpgradeTooltip featureId="pos-scan">
          <button
            type="button"
            className="tap-target inline-flex size-10 shrink-0 cursor-not-allowed items-center justify-center rounded-xl border border-[#e5e7eb] bg-white text-muted-foreground opacity-70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/[0.1] dark:bg-[#141414] dark:shadow-none"
            aria-label="Scan barcode"
          >
            <ScanLine className="size-[1.125rem]" strokeWidth={1.75} />
          </button>
        </UpgradeTooltip>
      )}
    </div>
  );
}
