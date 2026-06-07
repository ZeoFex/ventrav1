"use client";

import useSWR from "swr";
import Link from "next/link";
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

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function HomeKpiCards() {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);

  if (isLoading && !data) {
    return (
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
      ? "text-[#006c49] dark:text-[#6ffbbe]"
      : vsYesterdayDiffGhs < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  const kpiCardClass =
    "group flex flex-col rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-4 shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#006c49]/35 hover:shadow-[0_8px_24px_-8px_rgba(0,108,73,0.18)] active:translate-y-0 active:scale-[0.995] dark:border-white/[0.06] dark:bg-[#111] dark:shadow-none dark:hover:border-[#6ffbbe]/35 dark:hover:shadow-[0_8px_28px_-8px_rgba(111,251,190,0.12)]";

  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      <Link
        href="/dashboard/sales/revenue"
        className={kpiCardClass}
      >
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          Today&apos;s sales
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
          {formatGhs(todaySalesGhs)}
        </p>
      </Link>
      <Link
        href="/dashboard/sales/transactions"
        className={kpiCardClass}
      >
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          Transactions
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-[1.65rem]">
          {transactionCount.toLocaleString()}
        </p>
      </Link>
      <Link
        href="/dashboard/sales/revenue"
        className={kpiCardClass}
      >
        <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
          vs yesterday
        </p>
        <p className={`mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums tracking-tight sm:text-[1.65rem] ${vsYesterdayDiffClass}`}>
          {vsYesterdayDiffGhs > 0 ? "+" : ""}
          {formatGhs(vsYesterdayDiffGhs)}
        </p>
      </Link>
    </div>
  );
}
