import type { DriveStep } from "driver.js";
import {
  type PlanId,
  canAccess,
} from "@/config/plan-feature-access";
import type { SessionUser } from "@/app/components/auth/use-session";
import type { DashboardNavItem } from "@/app/components/dashboard/sidebar/dashboard-nav-config";
import { DASHBOARD_NAV_ITEMS } from "@/app/components/dashboard/sidebar/dashboard-nav-config";

export const DASHBOARD_TOUR_STORAGE_KEY = "ventra_dashboard_tour_v2";

/** Tour IDs after Home + header (+ optional mobile hint). Matches `data-tour-target` prefixes. */
const TOUR_NAV_PARENT_IDS = ["home", "pos", "products", "reports", "settings"] as const;

export type DashboardTourSidebarMount = "desktop" | "mobile";

export function isDashboardTourDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DASHBOARD_TOUR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markDashboardTourDismissed(): void {
  try {
    window.localStorage.setItem(DASHBOARD_TOUR_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetDashboardTourProgress(): void {
  try {
    window.localStorage.removeItem(DASHBOARD_TOUR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function dashboardTourShowsNavParent(
  user: SessionUser,
  item: DashboardNavItem,
  branchId: string,
): boolean {
  if (item.branchOnly && branchId === "all") return false;
  if (item.globalOnly && branchId !== "all") return false;

  if (user.subscriptionStatus === "past_due" && item.id !== "home") return false;

  if (
    !canAccess(
      user.plan as PlanId,
      item.id,
      user.subscriptionStatus,
      user.currentPeriodEnd,
    )
  ) {
    return false;
  }

  if (user.role !== "owner" && user.permissions.length > 0) {
    if (item.id === "home") return true;
    if (user.permissions.includes(item.id)) return true;
    if (
      item.children?.some((c) =>
        user.permissions.includes(c.id),
      )
    ) {
      return true;
    }
    return false;
  }

  return true;
}

/** Human copy per sidebar parent ids we highlight */
const NAV_TOUR_POPOVER: Partial<
  Record<(typeof TOUR_NAV_PARENT_IDS)[number], { title: string; description: string }>
> = {
  home: {
    title: "Home",
    description:
      "Return here for Today’s KPIs, quick shortcuts, and recent activity tailored to your business.",
  },
  pos: {
    title: "Point of sale",
    description:
      "Start checkout and manage held tabs. POS needs a branch selected—all branches disables this.",
  },
  products: {
    title: "Products",
    description:
      "Manage your catalogue, variants, pricing, categories, tags, and stock from one hub.",
  },
  reports: {
    title: "Reports",
    description:
      "Review sales summaries, valuations, taxes, and other snapshots for decision-making.",
  },
  settings: {
    title: "Settings",
    description:
      "Profile, receipts, integrations, referrals, notifications, security, billing, and account preferences.",
  },
};

export function resolveTourSidebarMount(): DashboardTourSidebarMount {
  if (typeof window === "undefined") return "desktop";
  return window.matchMedia("(min-width: 1024px)").matches
    ? "desktop"
    : "mobile";
}

/**
 * Drops steps whose string selector misses in the DOM (e.g. staff without Settings).
 */
export function filterResolvableTourSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((step) => {
    if (step.element == null) return true;
    if (typeof step.element !== "string") return true;
    return document.querySelector(step.element) !== null;
  });
}

export function dashboardTourShowsCopilotEntry(user: SessionUser): boolean {
  if (user.subscriptionStatus === "past_due") return false;
  return canAccess(
    user.plan as PlanId,
    "copilot",
    user.subscriptionStatus,
    user.currentPeriodEnd,
  );
}

export type BuildTourStepsOpts = {
  user: SessionUser;
  branchId: string;
  sidebarMount: DashboardTourSidebarMount;
  /** True when lg breakpoint is inactive (narrow viewport). */
  isMobileViewport: boolean;
  openMobileNav: () => void;
};

export function buildDashboardTourSteps(opts: BuildTourStepsOpts): DriveStep[] {
  const { user, branchId, sidebarMount, isMobileViewport, openMobileNav } =
    opts;

  const steps: DriveStep[] = [
    {
      popover: {
        title: "Welcome to VentraPOS",
        description:
          "Take a quick tour of your dashboard. You can skip anytime—the tour will not restart automatically.",
        side: "over",
        align: "center",
      },
    },
    {
      element: `[data-tour-target="home-greeting"][data-tour-mount="main"]`,
      popover: {
        title: "Your overview",
        description:
          "This area greets you and sets context for the day. Everything below updates with your live data.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: `[data-tour-target="home-kpis"][data-tour-mount="main"]`,
      popover: {
        title: "Today’s numbers",
        description:
          "Key metrics at a glance—tap through for detail pages as you grow into the product.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: `[data-tour-target="home-quick-sale"][data-tour-mount="main"]`,
      popover: {
        title: "Quick sale",
        description:
          "Tap a best-selling product to add it to your cart instantly—checkout from the floating cart button.",
        side: "top",
        align: "start",
      },
    },
    {
      element: `[data-tour-target="header-search"][data-tour-mount="main"]`,
      popover: {
        title: "Search",
        description:
          "Find pages, products, and shortcuts quickly from anywhere in the dashboard.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: `[data-tour-target="header-branch"][data-tour-mount="main"]`,
      popover: {
        title: "Branch scope",
        description:
          "Switch between all branches and a single location. POS and some tools only appear when one branch is selected.",
        side: "bottom",
        align: "start",
      },
    },
  ];

  if (isMobileViewport) {
    steps.push({
      element: `[data-tour-target="header-mobile-menu"][data-tour-mount="main"]`,
      popover: {
        title: "Navigation menu",
        description:
          "On mobile, open this menu to reach every section— we will expand it for the next steps.",
        side: "bottom",
        align: "end",
      },
    });
  }

  for (const id of TOUR_NAV_PARENT_IDS) {
    const item = DASHBOARD_NAV_ITEMS.find((i) => i.id === id);
    if (!item) continue;
    if (!dashboardTourShowsNavParent(user, item, branchId)) continue;
    if (id === "pos" && branchId === "all") continue;

    const copy = NAV_TOUR_POPOVER[id];
    if (!copy) continue;

    steps.push({
      element: `[data-tour-target="nav-${id}"][data-tour-mount="${sidebarMount}"]`,
      popover: {
        title: copy.title,
        description: copy.description,
        side: sidebarMount === "desktop" ? "right" : "right",
        align: "start",
      },
      onHighlightStarted: isMobileViewport
        ? (_el, _s, { driver }) => {
            openMobileNav();
            requestAnimationFrame(() => driver.refresh());
          }
        : undefined,
    });
  }

  if (
    !isMobileViewport &&
    dashboardTourShowsCopilotEntry(user)
  ) {
    steps.push({
      element: `[data-tour-target="copilot-sidebar"][data-tour-mount="main"]`,
      popover: {
        title: "Zuri assistant",
        description:
          "Open Zuri for Pro workspaces—insights, summaries, and in-panel help grounded in your plan.",
        side: "right",
        align: "center",
      },
    });
  } else if (isMobileViewport && dashboardTourShowsCopilotEntry(user)) {
    steps.push({
      popover: {
        title: "Zuri on mobile",
        description:
          "Use the floating Zuri button lower on the screen to open the same assistant when your plan includes it.",
        side: "over",
        align: "center",
      },
    });
  }

  return steps;
}
