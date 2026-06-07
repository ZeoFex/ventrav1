"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DASHBOARD_NAV_ITEMS } from "./dashboard-nav-config";
import { SidebarNavIcon } from "./sidebar-icons";
import { useBranchContext } from "../branch-context";
import { useSession } from "../../auth/use-session";
import { canAccess, PlanId } from "@/config/plan-feature-access";
import { UpgradeTooltip } from "./upgrade-tooltip";
import { SidebarTooltip } from "./sidebar-tooltip";
import { SidebarFlyout } from "./sidebar-flyout";

import type { DashboardTourSidebarMount } from "@/app/lib/dashboard-product-tour";

function pathActive(pathname: string, href: string, allHrefs?: string[]): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  if (pathname === href) return true;

  const isPrefix = pathname.startsWith(`${href}/`);
  if (!isPrefix) return false;

  // If it's a prefix match, ensure there isn't a more specific match in the same list
  if (allHrefs) {
    const betterMatch = allHrefs.some(
      (h) => h !== href && pathname.startsWith(h) && h.length > href.length
    );
    if (betterMatch) return false;
  }

  return true;
}

export function SidebarNav({
  onNavigate,
  isCollapsed = false,
  tourMount = "desktop",
}: {
  /** Close mobile drawer after navigation (or on route change). */
  onNavigate?: () => void;
  isCollapsed?: boolean;
  tourMount?: DashboardTourSidebarMount;
}) {
  const pathname = usePathname() || "";
  const { branchId } = useBranchContext();
  const { user, isLoading: sessionLoading } = useSession();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(["pos"]));

  // Filter items based on active branch context AND user permissions
  const filteredNavItems = useMemo(() => {
    return DASHBOARD_NAV_ITEMS
      .map((item) => ({
        ...item,
        children: item.children?.filter((child) => {
          if (user && user.role !== "owner" && user.permissions.length > 0) {
            if (user.permissions.includes(child.id)) return true;
            if (
              child.id === "suppliers-list" &&
              user.permissions.includes("customer-list")
            ) {
              return true;
            }
            if (
              child.id === "supplier-add" &&
              user.permissions.includes("suppliers-list")
            ) {
              return true;
            }
            if (
              child.id === "finance-expense-reports" &&
              user.permissions.includes("finance-expenses")
            ) {
              return true;
            }
            if (
              child.id === "finance-reminders" &&
              user.permissions.includes("finance-expenses")
            ) {
              return true;
            }
            if (child.id === "stock-take" && user.permissions.includes("stock")) {
              return true;
            }
            return false;
          }
          return true;
        }),
      }))
      .filter((item) => {
        // 1. Context checks
        if (item.branchOnly && branchId === "all") return false;
        if (item.globalOnly && branchId !== "all") return false;

        // 2. Permission checks (Skip for owners or if no permissions defined yet)
        if (user && user.role !== "owner" && user.permissions.length > 0) {
          // Some items (like 'home') might not have explicit permissions or are always allowed
          if (item.id === "home") return true;

          // Check if item id is in user's permissions OR if it has any permitted children
          const hasParentPerm = user.permissions.includes(item.id);
          const hasChildPerm = item.children && item.children.length > 0;

          if (!hasParentPerm && !hasChildPerm) return false;
        }

        return true;
      });
  }, [branchId, user]);

  // All top-level hrefs to help pathActive avoid conflicts
  const allParentHrefs = useMemo(() => filteredNavItems.map(i => i.href), [filteredNavItems]);

  const expandForPath = useMemo(() => {
    const next = new Set<string>();
    for (const item of filteredNavItems) {
      if (!item.children?.length) continue;
      const childHrefs = item.children.map(c => c.href);
      const childHit = item.children.some((c) => pathActive(pathname, c.href, childHrefs));
      const parentHit = pathActive(pathname, item.href, allParentHrefs);
      if (childHit || parentHit) next.add(item.id);
    }
    return next;
  }, [pathname, filteredNavItems, allParentHrefs]);

  useEffect(() => {
    if (expandForPath.size > 0) {
      setOpenIds(expandForPath);
    }
  }, [expandForPath]);

  const pathnameCloseSkipFirst = useRef(true);
  useEffect(() => {
    if (!onNavigate) return;
    if (pathnameCloseSkipFirst.current) {
      pathnameCloseSkipFirst.current = false;
      return;
    }
    onNavigate();
  }, [pathname, onNavigate]);

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set<string>();
      // Accordion: only one open at a time
      if (!prev.has(id)) next.add(id);
      return next;
    });
  }, []);

  return (
    <nav className="flex flex-col gap-0.5 px-1" aria-label="Dashboard">
      {filteredNavItems.map((item) => {
        const hasChildren = Boolean(item.children?.length);
        const expanded = openIds.has(item.id);
        const childHrefs = item.children?.map(c => c.href) ?? [];
        const anyChildActive =
          item.children?.some((c) => pathActive(pathname, c.href, childHrefs)) ?? false;
        const parentSelf = pathActive(pathname, item.href, allParentHrefs);
        const rowActive =
          hasChildren && expanded
            ? parentSelf || anyChildActive
            : parentSelf;

        const accent =
          "text-[#006c49] dark:text-[#6ffbbe]";
        const muted = "text-muted-foreground";
        const rowClass = rowActive
          ? `rounded-xl bg-[#003527]/10 dark:bg-[#6ffbbe]/10 ${accent}`
          : `rounded-xl text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#1a1a1a] ${muted}`;

        return (
          <div
            key={item.id}
            className="flex flex-col"
            data-tour-target={`nav-${item.id}`}
            data-tour-mount={tourMount}
          >
            <div
              className={`flex min-h-[2.75rem] items-stretch gap-0.5 ${rowClass}`}
            >
              {(() => {
                const hasAccess = user 
                  ? (user.subscriptionStatus === "past_due" && item.id !== "home" 
                      ? false 
                      : canAccess(user.plan as PlanId, item.id)) 
                  : false;

                const content = item.collapsibleOnly ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasAccess) return;
                      toggle(item.id);
                    }}
                    className={`tap-target flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[14px] font-medium text-left ${rowActive ? accent : "text-inherit"
                      } ${!hasAccess ? "pointer-events-none" : ""}`}
                    aria-disabled={!hasAccess}
                  >
                    <span
                      className={`${rowActive ? accent : "text-muted-foreground"} ${isCollapsed ? "mx-auto" : ""}`}
                    >
                      <SidebarNavIcon id={item.icon} />
                    </span>
                    {!isCollapsed && <span className="truncate transition-all animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (!hasAccess) {
                        e.preventDefault();
                        return;
                      }
                      onNavigate?.();
                    }}
                    onMouseEnter={() => {
                      if (hasAccess && item.id === "home") {
                        import("@/app/lib/swr-utils").then(m => m.prefetchDashboardData("/api/dashboard/home"));
                      }
                    }}
                    className={`tap-target flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[14px] font-medium ${rowActive ? accent : "text-inherit"
                      } ${!hasAccess ? "pointer-events-none" : ""}`}
                    tabIndex={!hasAccess ? -1 : undefined}
                    aria-disabled={!hasAccess}
                  >
                    <span
                      className={`${rowActive ? accent : "text-muted-foreground"} ${isCollapsed ? "mx-auto" : ""}`}
                    >
                      <SidebarNavIcon id={item.icon} />
                    </span>
                    {!isCollapsed && <span className="truncate transition-all animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                  </Link>
                );

                const toolkitContent = isCollapsed ? (
                  hasChildren ? (
                    <SidebarFlyout 
                      label={item.label} 
                      active={isCollapsed} 
                      children={item.children || []} 
                      pathname={pathname}
                      onNavigate={onNavigate}
                      trigger={content}
                      plan={user?.plan as PlanId | undefined}
                      subscriptionPastDue={user?.subscriptionStatus === "past_due"}
                    />
                  ) : (
                    <SidebarTooltip label={item.label} active={isCollapsed}>
                      {content}
                    </SidebarTooltip>
                  )
                ) : content;

                const wrappedContent = hasAccess ? toolkitContent : (
                  <UpgradeTooltip featureId={item.id}>
                    {toolkitContent}
                  </UpgradeTooltip>
                );

                return (
                  <>
                    {wrappedContent}
                    {hasChildren && !isCollapsed ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!hasAccess) return;
                          toggle(item.id);
                        }}
                        className={`tap-target flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg transition-colors sm:min-h-0 sm:min-w-10 ${rowActive ? accent : "text-muted-foreground hover:text-foreground"
                          } ${!hasAccess ? "opacity-50 cursor-not-allowed" : ""}`}
                        aria-expanded={expanded && hasAccess}
                        aria-controls={`subnav-${item.id}`}
                        aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
                        disabled={!hasAccess}
                      >
                        <ChevronDown
                          className={`size-4 shrink-0 transition-transform duration-200 ${expanded && hasAccess ? "-rotate-180" : ""
                            }`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      </button>
                    ) : null}
                  </>
                );
              })()}
            </div>

            {hasChildren && expanded && !isCollapsed ? (
              <ul
                id={`subnav-${item.id}`}
                className="ml-4 mt-0.5 space-y-0.5 border-l border-[#bfc9c3]/25 py-1 pl-3 dark:border-white/[0.08]"
              >
                {item.children!.map((child) => {
                  const childHrefs = item.children!.map(c => c.href);
                  const active = pathActive(pathname, child.href, childHrefs);
                  // Prefetch dashboard data on hover for instant feel
                  const hasAccess = user 
                    ? (user.subscriptionStatus === "past_due" 
                        ? false 
                        : canAccess(user.plan as PlanId, child.id)) 
                    : false;
                  
                  const handleMouseEnter = () => {
                    if (hasAccess && child.id === "sales-overview") {
                      import("@/app/lib/swr-utils").then(m => m.prefetchDashboardData("/api/sales/overview"));
                    }
                  };

                  const linkContent = (
                    <Link
                      href={child.href}
                      onClick={(e) => {
                        if (!hasAccess) {
                          e.preventDefault();
                          return;
                        }
                        onNavigate?.();
                      }}
                      onMouseEnter={handleMouseEnter}
                      className={`tap-target flex min-h-10 items-center gap-2 py-2 pl-1 text-[13px] transition-colors sm:min-h-0 ${active
                        ? "font-medium text-[#006c49] dark:text-[#6ffbbe]"
                        : "text-muted-foreground hover:text-foreground"
                        } ${!hasAccess ? "pointer-events-none" : ""}`}
                      tabIndex={!hasAccess ? -1 : undefined}
                      aria-disabled={!hasAccess}
                    >
                      <span
                        className={`size-1.5 shrink-0 rounded-full ${active
                          ? "bg-[#006c49] dark:bg-[#6ffbbe]"
                          : "bg-transparent"
                          }`}
                        aria-hidden
                      />
                      <span className="truncate">{child.label}</span>
                    </Link>
                  );

                  return (
                    <li key={child.id}>
                      {hasAccess ? linkContent : (
                        <UpgradeTooltip featureId={child.id}>
                          {linkContent}
                        </UpgradeTooltip>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
