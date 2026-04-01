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

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type RecentSale = {
  id: string;
  invoiceId: string;
  totalGhs: number;
  createdAt: string;
};

export function HomeRecentActivity() {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);

  if (isLoading && !data) {
    return (
      <section className="rounded-2xl border border-[#bfc9c3]/15 bg-surface-card dark:border-white/[0.06] dark:bg-[#111]">
        <div className="flex items-center justify-between border-b border-[#bfc9c3]/10 px-4 py-3 dark:border-white/[0.06] sm:px-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recent activity
          </h2>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </section>
    );
  }

  const recentSales: RecentSale[] = data?.recentSales ?? [];

  return (
    <section className="rounded-2xl border border-[#bfc9c3]/15 bg-surface-card dark:border-white/[0.06] dark:bg-[#111]">
      <div className="flex items-center justify-between border-b border-[#bfc9c3]/10 px-4 py-3 dark:border-white/[0.06] sm:px-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h2>
        <Link
          href="/dashboard/sales/transactions"
          className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
        </Link>
      </div>
      <ul className="divide-y divide-[#bfc9c3]/10 dark:divide-white/[0.06] min-h-[100px]">
        {recentSales.length === 0 ? (
          <li className="px-5 py-8 text-center text-[14px] text-muted-foreground">
            No recent activity. Start by completing a sale.
          </li>
        ) : (
          recentSales.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/dashboard/sales/transactions`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-surface-elevated/80 sm:px-5 dark:hover:bg-[#141414]"
              >
                <div className="min-w-0">
                  <p className="text-[13px] tabular-nums text-muted-foreground">
                    {formatTime(sale.createdAt)}
                  </p>
                  <p className="truncate text-[14px] font-medium text-foreground">
                    Sale #{sale.invoiceId}
                  </p>
                </div>
                <p className="shrink-0 text-[14px] font-medium tabular-nums text-foreground">
                  {formatGhs(sale.totalGhs)}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
