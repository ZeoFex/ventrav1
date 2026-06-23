"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, Bell, ChevronRight, Package, X } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useBranchContext } from "../branch-context";

const DISMISS_STORAGE_KEY = "ventrapos-home-alerts-dismissed";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch data");
  }
  return res.json();
};

type OwnerAlert = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  count?: number;
  tone: "amber" | "brand";
  icon: "alert" | "package";
  tourTarget?: string;
  /** Changes when underlying data changes so dismissed alerts can resurface. */
  signature: string;
};

function dismissKey(branchId: string, alertId: string): string {
  return `${branchId}:${alertId}`;
}

function readDismissed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, string>) {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* private mode */
  }
}

export function HomeOwnerAlerts() {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher, {
    revalidateOnFocus: true,
  });
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setHydrated(true);
  }, []);

  const dismissAlert = useCallback(
    (alert: OwnerAlert) => {
      const key = dismissKey(branchId, alert.id);
      setDismissed((prev) => {
        const next = { ...prev, [key]: alert.signature };
        writeDismissed(next);
        return next;
      });
    },
    [branchId],
  );

  const allAlerts = useMemo(() => {
    const alerts: OwnerAlert[] = [];

    const expiring = data?.expiringAlert;
    if (expiring?.lineCount > 0) {
      alerts.push({
        id: "expiring",
        signature: `${expiring.lineCount}:${expiring.productCount}:${expiring.days}`,
        title: `${expiring.lineCount} supply ${expiring.lineCount === 1 ? "line" : "lines"} expiring within ${expiring.days} days`,
        subtitle: `${expiring.productCount} ${expiring.productCount === 1 ? "product" : "products"} affected. Review stock before items expire.`,
        href: `/dashboard/inventory/expiring?days=${expiring.days}`,
        cta: "View expiring items",
        tone: "amber",
        icon: "alert",
      });
    }

    const pickupCount = data?.readyForPickupCount ?? 0;
    if (branchId !== "all" && pickupCount > 0) {
      alerts.push({
        id: "pickup",
        signature: String(pickupCount),
        title:
          pickupCount === 1
            ? "1 layaway order is ready for pickup"
            : `${pickupCount} layaway orders are ready for pickup`,
        subtitle: "Paid in full — complete pickup in customer orders",
        href: "/dashboard/pos/customer-orders",
        cta: "Open orders",
        count: pickupCount,
        tone: "brand",
        icon: "package",
        tourTarget: "home-ready-for-pickup",
      });
    }

    return alerts;
  }, [data, branchId]);

  const visibleAlerts = useMemo(() => {
    if (!hydrated) return allAlerts;
    return allAlerts.filter((alert) => {
      const key = dismissKey(branchId, alert.id);
      return dismissed[key] !== alert.signature;
    });
  }, [allAlerts, branchId, dismissed, hydrated]);

  if (isLoading && data == null) {
    return (
      <section className="space-y-3" aria-label="Shop alerts loading">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-[88px] rounded-2xl" />
      </section>
    );
  }

  if (visibleAlerts.length === 0) return null;

  return (
    <section
      className="space-y-3"
      aria-label="Shop alerts"
      data-tour-target="home-owner-alerts"
      data-tour-mount="main"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
          <Bell className="size-3.5" strokeWidth={2.25} aria-hidden />
        </span>
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Needs your attention
          </h2>
          <p className="text-[12px] text-muted-foreground">
            {visibleAlerts.length} active {visibleAlerts.length === 1 ? "alert" : "alerts"} for your shop
          </p>
        </div>
      </div>

      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            role="listitem"
            className="w-[min(100%,22rem)] shrink-0 snap-center sm:w-[min(48%,24rem)]"
            data-tour-target={alert.tourTarget}
            data-tour-mount={alert.tourTarget ? "main" : undefined}
          >
            <OwnerAlertCard alert={alert} onDismiss={() => dismissAlert(alert)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnerAlertCard({
  alert,
  onDismiss,
}: {
  alert: OwnerAlert;
  onDismiss: () => void;
}) {
  const isAmber = alert.tone === "amber";

  return (
    <div
      className={`relative flex h-full min-h-[88px] flex-col justify-between gap-3 rounded-2xl border px-4 py-3.5 pr-10 transition-[transform,box-shadow,border-color] duration-300 sm:flex-row sm:items-center sm:pr-12 ${
        isAmber
          ? "border-amber-200/80 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10"
          : "border-[#006c49]/25 bg-[#006c49]/[0.06] dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/[0.07]"
      }`}
    >
      <button
        type="button"
        onClick={onDismiss}
        className={`absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg transition-colors ${
          isAmber
            ? "text-amber-700/70 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300/80 dark:hover:bg-amber-500/20 dark:hover:text-amber-100"
            : "text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
        }`}
        aria-label={`Dismiss: ${alert.title}`}
      >
        <X className="size-4" strokeWidth={2.25} aria-hidden />
      </button>

      <Link
        href={alert.href}
        className="group flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
              isAmber
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                : "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
            }`}
          >
            {alert.icon === "alert" ? (
              <AlertTriangle className="size-4" strokeWidth={2} aria-hidden />
            ) : (
              <Package className="size-4" strokeWidth={2} aria-hidden />
            )}
          </span>
          <span className="min-w-0">
            <span
              className={`block text-[14px] font-semibold leading-snug ${
                isAmber ? "text-amber-900 dark:text-amber-100" : "text-foreground"
              }`}
            >
              {alert.title}
            </span>
            <span
              className={`mt-0.5 block text-[12px] leading-relaxed ${
                isAmber ? "text-amber-800/80 dark:text-amber-200/80" : "text-muted-foreground"
              }`}
            >
              {alert.subtitle}
            </span>
          </span>
        </div>

        <span className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end sm:self-center">
          {alert.count != null ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#006c49] px-2.5 py-1 text-[12px] font-bold tabular-nums text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
              {alert.count}
              <ChevronRight className="size-3.5 opacity-80" strokeWidth={2.5} aria-hidden />
            </span>
          ) : (
            <span
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-[13px] font-semibold text-white transition-colors ${
                isAmber
                  ? "bg-amber-600 group-hover:bg-amber-700 dark:bg-amber-500 dark:group-hover:bg-amber-600"
                  : "bg-[#006c49] group-hover:brightness-110 dark:bg-[#6ffbbe] dark:text-[#003527]"
              }`}
            >
              {alert.cta}
            </span>
          )}
        </span>
      </Link>
    </div>
  );
}
