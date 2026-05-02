import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardTourSidebarMount } from "@/app/lib/dashboard-product-tour";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { useDashboardNav } from "./dashboard-nav-context";
import { SidebarBrand } from "./sidebar/sidebar-brand";
import { SidebarNav } from "./sidebar/sidebar-nav";
import { CopilotSidebarTrigger } from "./copilot";

export function DashboardSidebarPanel({
  onNavigate,
  mobileClose,
  isCollapsed = false,
  tourMount = "desktop",
}: {
  onNavigate?: () => void;
  mobileClose?: () => void;
  isCollapsed?: boolean;
  tourMount?: DashboardTourSidebarMount;
}) {
  const { toggleIsCollapsed } = useDashboardNav();

  return (
    <>
      <div className="shrink-0 border-b border-[#bfc9c3]/15 px-4 py-5 dark:border-white/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <SidebarBrand onNavigate={mobileClose} isCollapsed={isCollapsed} />
          {mobileClose ? (
            <button
              type="button"
              onClick={mobileClose}
              className="tap-target flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-[#1a1a1a] sm:size-10"
              aria-label="Close menu"
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <div className="dashboard-sidebar-scroll min-h-0 flex-1 px-3 py-4 overflow-x-hidden">
        <SidebarNav
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
          tourMount={tourMount}
        />
      </div>

      <div className="shrink-0 space-y-4 border-t border-[#bfc9c3]/15 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:border-white/[0.06]">
        <div
          className="hidden w-full lg:block"
          data-tour-target="copilot-sidebar"
          data-tour-mount="main"
        >
          <CopilotSidebarTrigger isCollapsed={isCollapsed} />
        </div>
        <div className={`flex items-center gap-2 ${isCollapsed ? "flex-col" : "justify-between"}`}>
          <div className="flex flex-1 justify-center">
            <ThemeToggle />
          </div>
          {!mobileClose && (
            <button
              type="button"
              onClick={toggleIsCollapsed}
              className="tap-target flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#bfc9c3]/20 bg-white/50 text-muted-foreground shadow-sm transition-all hover:border-[#006c49]/30 hover:bg-[#006c49]/05 hover:text-[#006c49] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-[#6ffbbe]/30 dark:hover:bg-[#6ffbbe]/05 dark:hover:text-[#6ffbbe]"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="size-5" strokeWidth={2.5} />
              ) : (
                <ChevronLeft className="size-5" strokeWidth={2.5} />
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function DashboardSidebar() {
  const { isCollapsed } = useDashboardNav();

  return (
    <aside 
      className={`dashboard-sidebar hidden h-full min-h-0 shrink-0 flex-col border-r border-[#bfc9c3]/20 bg-surface-card dark:border-white/[0.08] dark:bg-[#0a0a0a] lg:flex transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[5.5rem]" : "w-[17.5rem]"
      }`}
    >
      <DashboardSidebarPanel isCollapsed={isCollapsed} tourMount="desktop" />
    </aside>
  );
}

export function DashboardSidebarMobileDrawer() {
  const { mobileNavOpen, closeMobileNav } = useDashboardNav();

  return (
    <aside
      id="dashboard-mobile-nav"
      aria-hidden={!mobileNavOpen}
      className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh max-h-dvh w-[min(100%-2.5rem,19rem)] flex-col border-r border-[#bfc9c3]/20 bg-surface-card shadow-[4px_0_24px_-8px_rgba(0,0,0,0.15)] dark:border-white/[0.08] dark:bg-[#0a0a0a] dark:shadow-[4px_0_24_8px_rgba(0,0,0,0.5)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out lg:hidden ${mobileNavOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"}`}
      style={{
        paddingLeft: "max(0px, env(safe-area-inset-left))",
        paddingTop: "max(0px, env(safe-area-inset-top))",
      }}
    >
      <DashboardSidebarPanel
        onNavigate={closeMobileNav}
        mobileClose={closeMobileNav}
        isCollapsed={false}
        tourMount="mobile"
      />
    </aside>
  );
}
