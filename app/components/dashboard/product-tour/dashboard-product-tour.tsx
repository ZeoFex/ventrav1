"use client";

import "driver.js/dist/driver.css";

import { driver } from "driver.js";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";
import {
  buildDashboardTourSteps,
  filterResolvableTourSteps,
  isDashboardTourDismissed,
  markDashboardTourDismissed,
  resolveTourSidebarMount,
} from "@/app/lib/dashboard-product-tour";
import { useSession } from "../../auth/use-session";
import { useBranchContext } from "../branch-context";
import { useDashboardNav } from "../dashboard-nav-context";

const MAIN_HOME_TARGETS = [
  `[data-tour-target="home-greeting"][data-tour-mount="main"]`,
  `[data-tour-target="home-kpis"][data-tour-mount="main"]`,
  `[data-tour-target="home-quick-actions"][data-tour-mount="main"]`,
];

function pathnameIsDashboardHome(p: string | null): boolean {
  return p === "/dashboard" || p === "/dashboard/";
}

function waitForHomeTargets(timeoutMs: number): Promise<boolean> {
  const start = performance.now();
  return new Promise((resolve) => {
    function tick() {
      if (MAIN_HOME_TARGETS.every((sel) => document.querySelector(sel))) {
        resolve(true);
        return;
      }
      if (performance.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    }
    tick();
  });
}

export function DashboardProductTour() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const { branchId } = useBranchContext();
  const { openMobileNav, closeMobileNav } = useDashboardNav();

  const userRef = useRef(user);
  userRef.current = user;

  const branchIdRef = useRef(branchId);
  branchIdRef.current = branchId;

  const persistDismissAfterDestroy = useRef(true);
  const driverInstanceRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionLoading) return;
    const sessionUser = userRef.current;
    if (!sessionUser) return;

    /** While tour incomplete, bounce any dashboard landing to `/dashboard` so Home anchors exist. */
    const dismissDone = isDashboardTourDismissed();
    if (
      pathname &&
      pathname.startsWith("/dashboard") &&
      !pathnameIsDashboardHome(pathname) &&
      !dismissDone
    ) {
      startTransition(() => router.replace("/dashboard"));
      return;
    }

    if (!pathnameIsDashboardHome(pathname)) return;
    if (dismissDone) return;

    let cancelled = false;

    (async () => {
      const hydrated = await waitForHomeTargets(3500);
      if (!hydrated && !cancelled) {
        /* continue—filterResolvableTourSteps will drop absent anchors */
      }

      if (cancelled || isDashboardTourDismissed()) return;

      const snapshotUser = userRef.current;
      if (!snapshotUser) return;

      const isMobileViewport = !window.matchMedia("(min-width: 1024px)").matches;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const stepsBuilt = buildDashboardTourSteps({
        user: snapshotUser,
        branchId: branchIdRef.current,
        sidebarMount: resolveTourSidebarMount(),
        isMobileViewport,
        openMobileNav,
      });
      const resolvedSteps = filterResolvableTourSteps(stepsBuilt);
      if (resolvedSteps.length === 0) return;

      if (cancelled || isDashboardTourDismissed()) return;

      persistDismissAfterDestroy.current = true;

      const drv = driver({
        showProgress: true,
        animate: !reduceMotion,
        smoothScroll: !reduceMotion,
        allowClose: true,
        allowKeyboardControl: true,
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Done",
        overlayClickBehavior: "nextStep",
        onDestroyed: () => {
          if (persistDismissAfterDestroy.current) {
            markDashboardTourDismissed();
          }
          closeMobileNav();
          driverInstanceRef.current = null;
        },
        steps: resolvedSteps,
      });

      driverInstanceRef.current = drv;
      drv.drive();
    })();

    return () => {
      cancelled = true;
      persistDismissAfterDestroy.current = false;
      const drv = driverInstanceRef.current;
      if (drv?.isActive?.()) drv.destroy();
    };
  }, [
    pathname,
    router,
    sessionLoading,
    user?.id,
    openMobileNav,
    closeMobileNav,
  ]);

  return null;
}
