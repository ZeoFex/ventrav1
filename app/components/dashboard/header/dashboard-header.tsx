"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useDashboardNav } from "../dashboard-nav-context";
import { HeaderBranchSelector } from "./header-branch-selector";
import { HeaderNotifications } from "./header-notifications";
import { ShopLiveAlerts } from "./shop-live-alerts";
import { HeaderSubscriptionProgress } from "./header-subscription-progress";
import { HeaderSearch } from "./header-search";
import { HeaderPosCategories, HeaderPosProductSearch } from "./header-pos-product-search";
import { HeaderUserMenu } from "./header-user-menu";
import { usePosProductSearch } from "../pos/pos-product-search-context";

export function DashboardHeader({
  userDisplayName,
}: {
  userDisplayName?: string;
}) {
  const { openMobileNav, mobileNavOpen } = useDashboardNav();
  const { showCatalogChrome } = usePosProductSearch();
  const pathname = usePathname() ?? "";
  const isPosSale = pathname.startsWith("/dashboard/pos/sale");
  const isOtherPos = pathname.startsWith("/dashboard/pos") && !isPosSale;
  const isHome = pathname === "/dashboard" || pathname === "/dashboard/";
  const showPosCatalogChrome = isPosSale && showCatalogChrome;

  return (
    <header
      className={`sticky top-0 z-30 grid shrink-0 gap-x-2 gap-y-1.5 border-b border-border bg-surface-card px-2.5 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-x-3 sm:px-4 sm:py-3 md:px-6 dark:border-white/[0.08] dark:bg-[#0a0a0a] ${
        isPosSale
          ? `grid-cols-[auto_minmax(0,1fr)_auto_auto] ${showPosCatalogChrome ? "grid-rows-[auto_auto]" : "grid-rows-1 items-center"} lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto_auto] lg:grid-rows-1 lg:items-center lg:gap-x-4`
          : isOtherPos
            ? "grid-cols-[auto_minmax(0,1fr)_auto_auto] grid-rows-1 items-center lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:gap-x-4"
          : isHome
            ? "grid-cols-[auto_minmax(0,1fr)_auto_auto] grid-rows-1 items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto_auto] lg:grid-rows-1 lg:items-center lg:gap-x-4"
            : "grid-cols-[auto_minmax(0,1fr)_auto_auto] grid-rows-[auto_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto_auto] lg:grid-rows-1 lg:items-center lg:gap-x-4"
      }`}
      role="banner"
    >
      <button
        type="button"
        onClick={openMobileNav}
        className="tap-target col-start-1 row-start-1 flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#bfc9c3]/20 text-foreground transition-colors hover:bg-surface-elevated lg:hidden dark:border-white/[0.1] dark:hover:bg-[#1a1a1a]"
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
        aria-controls="dashboard-mobile-nav"
        data-tour-target="header-mobile-menu"
        data-tour-mount="main"
      >
        <Menu className="size-[1.35rem]" strokeWidth={2} aria-hidden />
      </button>

      {isOtherPos ? (
        <div
          className="col-start-2 row-start-1 min-w-0 self-center lg:col-start-1 lg:row-start-1 lg:max-w-[min(100%,14rem)]"
          data-tour-target="header-branch"
          data-tour-mount="main"
        >
          <HeaderBranchSelector />
        </div>
      ) : (
        <>
          <div
            className="col-start-2 row-start-1 min-w-0 self-center lg:col-start-1 lg:row-start-1"
            data-tour-target="header-search"
            data-tour-mount="main"
          >
            {isPosSale ? (
              <HeaderPosProductSearch />
            ) : isHome ? (
              <>
                <div className="lg:hidden">
                  <HeaderBranchSelector compact />
                </div>
                <div className="hidden lg:block">
                  <HeaderSearch />
                </div>
              </>
            ) : (
              <HeaderSearch />
            )}
          </div>

          {isHome ? (
            <div
              className="hidden min-w-0 self-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:block lg:max-w-[min(100%,14rem)]"
              data-tour-target="header-branch"
              data-tour-mount="main"
            >
              <HeaderBranchSelector />
            </div>
          ) : showPosCatalogChrome ? (
            <>
              <div className="col-span-4 row-start-2 min-w-0 lg:hidden">
                <HeaderPosCategories />
              </div>
              <div
                className="hidden min-w-0 self-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:block lg:max-w-[min(100%,14rem)]"
                data-tour-target="header-branch"
                data-tour-mount="main"
              >
                <HeaderBranchSelector />
              </div>
            </>
          ) : (
            <div
              className={`min-w-0 self-center lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:max-w-[min(100%,14rem)] ${
                isPosSale ? "hidden lg:block" : "col-span-4 row-start-2"
              }`}
              data-tour-target="header-branch"
              data-tour-mount="main"
            >
              <HeaderBranchSelector />
            </div>
          )}
        </>
      )}

      <div
        className={`row-start-1 self-center flex items-center gap-2 relative ${
          isOtherPos ? "col-start-3 lg:col-start-2" : "col-start-3 lg:col-start-3"
        }`}
      >
        <div className="hidden lg:block">
          <HeaderSubscriptionProgress />
        </div>
        <HeaderNotifications />
        <ShopLiveAlerts />
      </div>

      <div
        className={`row-start-1 self-center ${
          isOtherPos ? "col-start-4 lg:col-start-3" : "col-start-4 lg:col-start-4"
        }`}
      >
        <HeaderUserMenu displayName={userDisplayName} />
      </div>
    </header>
  );
}
