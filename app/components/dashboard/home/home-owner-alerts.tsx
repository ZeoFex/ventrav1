"use client";

import Link from "next/link";
import useSWR from "swr";
import { AlertTriangle, Bell, ChevronRight, Package } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useBranchContext } from "../branch-context";

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
};

export function HomeOwnerAlerts() {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher, {
    revalidateOnFocus: true,
  });

  if (isLoading && data == null) {
    return (
      <section className="space-y-3" aria-label="Shop alerts loading">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-[88px] rounded-2xl" />
      </section>
    );
  }

  const alerts: OwnerAlert[] = [];

  const expiring = data?.expiringAlert;
  if (expiring?.lineCount > 0) {
    alerts.push({
      id: "expiring",
      title: `${expiring.lineCount} supply ${expiring.lineCount === 1 ? "line" : "lines"} expiring within ${expiring.days} days`,
      subtitle: `${expiring.productCount} ${expiring.productCount === 1 ? "product" : "products"} affected. Review stock before items expire.`,
      href: "/dashboard/inventory",
      cta: "View inventory",
      tone: "amber",
      icon: "alert",
    });
  }

  const pickupCount = data?.readyForPickupCount ?? 0;
  if (branchId !== "all" && pickupCount > 0) {
    alerts.push({
      id: "pickup",
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

  if (alerts.length === 0) return null;

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
            {alerts.length} active {alerts.length === 1 ? "alert" : "alerts"} for your shop
          </p>
        </div>
      </div>

      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {alerts.map((alert) => (
          <div
            key={alert.id}
            role="listitem"
            className="w-[min(100%,22rem)] shrink-0 snap-center sm:w-[min(48%,24rem)]"
            data-tour-target={alert.tourTarget}
            data-tour-mount={alert.tourTarget ? "main" : undefined}
          >
            <OwnerAlertCard alert={alert} />
          </div>
        ))}
      </div>
    </section>
  );
}

function OwnerAlertCard({ alert }: { alert: OwnerAlert }) {
  const isAmber = alert.tone === "amber";

  return (
    <Link
      href={alert.href}
      className={`group flex h-full min-h-[88px] flex-col justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 active:scale-[0.995] sm:flex-row sm:items-center ${
        isAmber
          ? "border-amber-200/80 bg-amber-50 hover:border-amber-300 hover:shadow-[0_8px_24px_-12px_rgba(245,158,11,0.35)] dark:border-amber-500/25 dark:bg-amber-500/10 dark:hover:border-amber-500/40"
          : "border-[#006c49]/25 bg-[#006c49]/[0.06] hover:border-[#006c49]/40 hover:shadow-[0_8px_24px_-10px_rgba(0,108,73,0.25)] dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/[0.07] dark:hover:border-[#6ffbbe]/40"
      }`}
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
  );
}
