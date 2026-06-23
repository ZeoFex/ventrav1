"use client";

import Link from "next/link";
import useSWR from "swr";
import { Package, ChevronRight } from "lucide-react";
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

export function HomeReadyForPickupBanner() {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);

  if (branchId === "all") return null;

  if (isLoading && data == null) {
    return <Skeleton className="h-[52px] rounded-2xl" />;
  }

  const count = data?.readyForPickupCount ?? 0;
  if (count <= 0) return null;

  const label =
    count === 1
      ? "1 layaway order is ready for pickup"
      : `${count} layaway orders are ready for pickup`;

  return (
    <Link
      href="/dashboard/pos/customer-orders"
      className="group flex items-center gap-3 rounded-2xl border border-[#006c49]/25 bg-[#006c49]/[0.06] px-4 py-3.5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#006c49]/40 hover:shadow-[0_8px_24px_-10px_rgba(0,108,73,0.25)] active:scale-[0.995] dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/[0.07] dark:hover:border-[#6ffbbe]/40"
      data-tour-target="home-ready-for-pickup"
      data-tour-mount="main"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
        <Package className="size-4" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">{label}</span>
        <span className="block text-[12px] text-muted-foreground">
          Paid in full — complete pickup in customer orders
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[#006c49] px-2.5 py-1 text-[12px] font-bold tabular-nums text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
        {count}
        <ChevronRight className="size-3.5 opacity-80" strokeWidth={2.5} aria-hidden />
      </span>
    </Link>
  );
}
