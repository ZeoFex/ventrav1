"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  ClipboardList,
  PackagePlus,
  ScanBarcode,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useBranchContext } from "../branch-context";
import { Skeleton } from "../ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(n);
}

const QUICK_LINKS = [
  {
    href: "/dashboard/pos/sale",
    label: "Checkout",
    icon: ShoppingCart,
    tourTarget: undefined as string | undefined,
  },
  {
    href: "/dashboard/pos/customer-orders",
    label: "Orders",
    icon: ClipboardList,
    tourTarget: undefined,
  },
  {
    href: "/dashboard/products/new",
    label: "Add item",
    icon: PackagePlus,
    tourTarget: undefined,
  },
] as const;

export function HomeMobileHub() {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);

  if (branchId === "all") {
    return (
      <div className="rounded-2xl border border-dashed border-[#bfc9c3]/30 bg-muted/20 px-4 py-5 text-center text-[13px] text-muted-foreground lg:hidden">
        Select a branch in the header to use scan &amp; sell on this device.
      </div>
    );
  }

  return (
    <section
      className="space-y-3 lg:hidden"
      aria-label="Quick POS actions"
      data-tour-target="home-mobile-hub"
      data-tour-mount="main"
    >
      {isLoading && !data ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-[#003527] to-[#006c49] px-4 py-3.5 text-white shadow-lg dark:from-[#0a1f18] dark:to-[#006c49]/90">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
              Today&apos;s sales
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">
              {formatGhs(data?.todaySalesGhs ?? 0)}
            </p>
          </div>
          <div className="text-right">
            <p className="inline-flex items-center gap-1 text-[12px] text-white/80">
              <TrendingUp className="size-3.5" />
              {data?.transactionCount ?? 0} sales
            </p>
          </div>
        </div>
      )}

      <Link
        href="/dashboard/pos/scan"
        className="flex items-center justify-center gap-3 rounded-2xl bg-[#006c49] px-5 py-4 text-[15px] font-bold text-white shadow-[0_8px_24px_-8px_rgba(0,108,73,0.55)] transition-transform active:scale-[0.98] dark:bg-[#6ffbbe] dark:text-[#003527]"
        data-tour-target="home-scan-cta"
        data-tour-mount="main"
      >
        <ScanBarcode className="size-6" strokeWidth={2.25} aria-hidden />
        Scan barcode to sell
      </Link>

      <div className="grid grid-cols-3 gap-2">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#bfc9c3]/20 bg-surface-card px-2 py-3.5 text-center transition-colors active:bg-muted/40 dark:border-white/[0.08] dark:bg-[#111]"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
              <Icon className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <span className="text-[11px] font-semibold text-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
