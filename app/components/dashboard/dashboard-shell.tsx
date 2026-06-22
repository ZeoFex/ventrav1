"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
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
import { OfflineBanner } from "./offline-banner";
import { initOfflineSync } from "@/app/lib/offline/offline-sync";
import { GlobalCartIndicator } from "./pos/global-cart-indicator";
import { TrialBanner } from "./trial-banner";
import { CopilotMobileFab, CopilotPanel, CopilotProvider } from "./copilot";
import { DashboardMobileBottomNav } from "./dashboard-mobile-bottom-nav";
import { DashboardProductTour } from "./product-tour/dashboard-product-tour";

function DashboardShellFrame({
  children,
  userDisplayName,
}: {
  children: ReactNode;
  userDisplayName?: string;
}) {
  const { mobileNavOpen, closeMobileNav } = useDashboardNav();

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

  // Initialize offline sync engine
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

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-elevated/50 dark:bg-background">
        <TrialBanner />
        <OfflineBanner />
        <DashboardHeader userDisplayName={userDisplayName} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>
      <DashboardMobileBottomNav />
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
          <CopilotProvider>
            <DashboardShellFrame userDisplayName={userDisplayName}>
              {children}
            </DashboardShellFrame>
          </CopilotProvider>
        </GlobalCartProvider>
      </BranchProvider>
    </DashboardNavProvider>
  );
}
