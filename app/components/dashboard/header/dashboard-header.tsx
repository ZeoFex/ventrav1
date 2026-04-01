"use client";

import { Menu } from "lucide-react";
import { useDashboardNav } from "../dashboard-nav-context";
import { HeaderBranchSelector } from "./header-branch-selector";
import { HeaderNotifications } from "./header-notifications";
import { HeaderSubscriptionProgress } from "./header-subscription-progress";
import { HeaderSearch } from "./header-search";
import { HeaderUserMenu } from "./header-user-menu";

export function DashboardHeader({
  userDisplayName,
}: {
  userDisplayName?: string;
}) {
  const { openMobileNav, mobileNavOpen } = useDashboardNav();

  return (
    <header
      className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] grid-rows-[auto_auto] gap-x-2 gap-y-2 border-b border-[#bfc9c3]/15 bg-surface-card px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:gap-x-3 sm:px-4 sm:py-3 md:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto_auto] lg:grid-rows-1 lg:items-center lg:gap-x-4 dark:border-white/[0.08] dark:bg-[#0a0a0a]"
      role="banner"
    >
      <button
        type="button"
        onClick={openMobileNav}
        className="tap-target col-start-1 row-start-1 flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#bfc9c3]/20 text-foreground transition-colors hover:bg-surface-elevated lg:hidden dark:border-white/[0.1] dark:hover:bg-[#1a1a1a]"
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        aria-controls="dashboard-mobile-nav"
      >
        <Menu className="size-[1.35rem]" strokeWidth={2} aria-hidden />
      </button>

      <div className="col-start-2 row-start-1 min-w-0 self-center lg:col-start-1 lg:row-start-1">
        <HeaderSearch />
      </div>

      <div className="col-span-4 row-start-2 min-w-0 self-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-[min(100%,14rem)]">
        <HeaderBranchSelector />
      </div>

      <div className="col-start-3 row-start-1 self-center lg:col-start-3 flex items-center gap-2 relative">
        <HeaderSubscriptionProgress />
        <HeaderNotifications />
      </div>

      <div className="col-start-4 row-start-1 self-center lg:col-start-4">
        <HeaderUserMenu displayName={userDisplayName} />
      </div>
    </header>
  );
}
