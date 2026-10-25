"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "./header/dashboard-header";
import {
  DashboardSidebar,
  DashboardSidebarMobileDrawer,
} from "./dashboard-sidebar";
import {
  DashboardNavProvider,
  useDashboardNav,
} from "./dashboard-nav-context";
import { BranchProvider } from "./branch-context";
import { GlobalCartProvider } from "./pos/global-cart-context";
import { PosProductSearchProvider } from "./pos/pos-product-search-context";
import { HomeCatalogFilterProvider } from "./home/home-catalog-filter-context";
import { OfflineBanner } from "./offline-banner";
import { initOfflineSync } from "@/app/lib/offline/offline-sync";
import { GlobalCartIndicator } from "./pos/global-cart-indicator";
import { TrialBanner } from "./trial-banner";
import { CopilotMobileFab, CopilotPanel, CopilotProvider } from "./copilot";
import { DashboardProductTour } from "./product-tour/dashboard-product-tour";

function DashboardShellFrame({
  children,
  userDisplayName,
}: {
  children: ReactNode;
  userDisplayName?: string;
}) {
  const { mobileNavOpen, closeMobileNav } = useDashboardNav();
  const pathname = usePathname() ?? "";
  const lockMainScroll =
    pathname === "/dashboard" ||
    pathname === "/dashboard/" ||
    pathname.startsWith("/dashboard/ecommerce") ||
    pathname.startsWith("/dashboard/pos/sale") ||
    pathname.startsWith("/dashboard/pos/receipts") ||
    pathname === "/dashboard/products" ||
    pathname === "/dashboard/inventory" ||
    pathname === "/dashboard/inventory/stock-take" ||
    /^\/dashboard\/suppliers\/(?!new$)[^/]+$/.test(pathname) ||
    /^\/dashboard\/customers\/(?!new$)[^/]+$/.test(pathname) ||
    /^\/dashboard\/products\/(?!new$|tags$|categories$|barcodes$)[^/]+$/.test(pathname);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileNav();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) closeMobileNav();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    const cleanup = initOfflineSync();
    return cleanup;
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      ) : null}

      <DashboardSidebar />
      <DashboardSidebarMobileDrawer />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
        <TrialBanner />
        <OfflineBanner />
        <DashboardHeader userDisplayName={userDisplayName} />
        <div
          className={
            lockMainScroll
              ? "flex min-h-0 flex-1 flex-col overflow-hidden [&>*]:min-h-0 [&>*]:flex-1"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-0"
          }
        >
          {children}
        </div>
      </div>
      <GlobalCartIndicator />
      <CopilotMobileFab />
      <CopilotPanel />
      <DashboardProductTour />
    </div>
  );
}

export function DashboardShell({
  children,
  userDisplayName,
}: {
  children: ReactNode;
  /** Optional until auth provides a real profile name. */
  userDisplayName?: string;
}) {
  return (
    <DashboardNavProvider>
      <BranchProvider>
        <GlobalCartProvider>
          <PosProductSearchProvider>
            <HomeCatalogFilterProvider>
              <CopilotProvider>
                <DashboardShellFrame userDisplayName={userDisplayName}>
                  {children}
                </DashboardShellFrame>
              </CopilotProvider>
            </HomeCatalogFilterProvider>
          </PosProductSearchProvider>
        </GlobalCartProvider>
      </BranchProvider>
    </DashboardNavProvider>
  );
}
