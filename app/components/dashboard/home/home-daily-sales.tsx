"use client";

import useSWR from "swr";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
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

function formatGhs(n: number, compact = false): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(n);
}

type HomeDailySalesProps = {
  variant?: "cards" | "banner";
};

export function HomeDailySales({ variant = "cards" }: HomeDailySalesProps) {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);

  if (branchId === "all") {
    return null;
  }

  if (isLoading && !data) {
    return variant === "banner" ? (
      <Skeleton className="h-[72px] rounded-2xl" />
    ) : (
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  const todaySalesGhs = data?.todaySalesGhs ?? 0;
  const transactionCount = data?.transactionCount ?? 0;
  const vsYesterdayDiffGhs =
    data?.vsYesterdayDiffGhs ?? todaySalesGhs - (data?.yesterdaySalesGhs ?? 0);
  const vsYesterdayDiffClass =
    vsYesterdayDiffGhs > 0
      ? "text-[#6ffbbe]"
      : vsYesterdayDiffGhs < 0
        ? "text-red-300"
        : "text-white/70";

  if (variant === "banner") {
    const TrendIcon = vsYesterdayDiffGhs >= 0 ? TrendingUp : TrendingDown;

    return (
      <Link
        href="/dashboard/sales/revenue"
        className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-[#003527] to-[#006c49] px-4 py-3.5 text-white shadow-lg transition-transform active:scale-[0.99] dark:from-[#0a1f18] dark:to-[#006c49]/90"
        data-tour-target="home-kpis"
        data-tour-mount="main"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            Today&apos;s sales
          </p>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
            {formatGhs(todaySalesGhs, true)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[12px] font-semibold tabular-nums text-white/90">
            {transactionCount} {transactionCount === 1 ? "sale" : "sales"}
          </p>
          <p className={`mt-0.5 inline-flex items-center justify-end gap-1 text-[11px] font-medium ${vsYesterdayDiffClass}`}>
            <TrendIcon className="size-3" aria-hidden />
            {vsYesterdayDiffGhs > 0 ? "+" : ""}
            {formatGhs(vsYesterdayDiffGhs, true)} vs yesterday
          </p>
        </div>
      </Link>
    );
  }

  const kpiCardClass =
    "group flex flex-col rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#006c49]/35 hover:shadow-[0_8px_24px_-8px_rgba(0,108,73,0.18)] active:translate-y-0 active:scale-[0.995] dark:border-white/[0.06] dark:bg-[#111] dark:shadow-none dark:hover:border-[#6ffbbe]/35 dark:hover:shadow-[0_8px_28px_-8px_rgba(111,251,190,0.12)]";

  return (
    <div
      className="grid gap-3 sm:grid-cols-3 sm:gap-4"
      data-tour-target="home-kpis"
      data-tour-mount="main"
    >
      <Link href="/dashboard/sales/revenue" className={kpiCardClass}>
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          Today&apos;s sales
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
          {formatGhs(todaySalesGhs)}
        </p>
      </Link>
      <Link href="/dashboard/sales/transactions" className={kpiCardClass}>
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          Transactions
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
          {transactionCount.toLocaleString()}
        </p>
      </Link>
      <Link href="/dashboard/sales/revenue" className={kpiCardClass}>
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          vs yesterday
        </p>
        <p
          className={`mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem] ${
            vsYesterdayDiffGhs > 0
              ? "text-[#006c49] dark:text-[#6ffbbe]"
              : vsYesterdayDiffGhs < 0
                ? "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
          }`}
        >
          {vsYesterdayDiffGhs > 0 ? "+" : ""}
          {formatGhs(vsYesterdayDiffGhs)}
        </p>
      </Link>
    </div>
  );
}
