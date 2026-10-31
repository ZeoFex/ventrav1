"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  BarChart3,
  ChevronRight,
  Package,
  PackagePlus,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useBranchContext } from "../branch-context";
import { useSession } from "../../auth/use-session";
import { type ProductRow } from "../products/types";
import { HomeOwnerAlerts } from "./home-owner-alerts";
import { HomeGreeting } from "./home-greeting";
import { HomeVariationModal, useHomeAddToCart } from "./home-cart-shared";
import { Skeleton } from "../ui/skeleton";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number, compact = false): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(n);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const AVATAR_TONES = [
  "bg-[#006c49] text-white",
  "bg-[#0f766e] text-white",
  "bg-[#14532d] text-[#6ffbbe]",
  "bg-[#047857] text-white",
  "bg-[#064e3b] text-[#d1fae5]",
];

const ACTIONS = [
  {
    href: "/shop",
    label: "Shop here",
    hint: "Everything you need is here",
    icon: ShoppingBag,
    tone: "bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]",
    wide: true,
  },
  {
    href: "/dashboard/pos/sale",
    label: "New sale",
    hint: "Open checkout",
    icon: ShoppingCart,
    tone: "bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]",
  },
  {
    href: "/dashboard/sales/overview",
    label: "Analytics",
    hint: "Sales reports",
    icon: BarChart3,
    tone: "bg-[#0f766e]/12 text-[#0f766e] dark:bg-teal-400/15 dark:text-teal-300",
  },
  {
    href: "/dashboard/products/new",
    label: "Add products",
    hint: "Grow the catalog",
    icon: PackagePlus,
    tone: "bg-amber-500/12 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    hint: "Regulars & accounts",
    icon: Users,
    tone: "bg-sky-500/12 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  },
] as const;

type TopCustomer = {
  id: string;
  name: string;
  orderCount: number;
  spentGhs: number;
};

type RecentSale = {
  id: string;
  invoiceId: string;
  totalGhs: number;
  createdAt: string;
};

type BoughtProduct = ProductRow & { qtySold?: number };

export function HomeMobileStorefront() {
  const { branchId } = useBranchContext();
  const { user } = useSession();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);
  const { handleAdd, variationProduct, setVariationProduct } = useHomeAddToCart();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  if (branchId === "all") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 text-center">
        <Store className="mb-3 size-8 text-muted-foreground/50" />
        <p className="text-[15px] font-semibold text-foreground">Select a branch</p>
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          Choose a branch in the header to see today&apos;s sales and start selling.
        </p>
      </div>
    );
  }

  const todaySalesGhs = data?.todaySalesGhs ?? 0;
  const transactionCount = data?.transactionCount ?? 0;
  const vsYesterdayPercent = data?.vsYesterdayPercent ?? 0;
  const vsYesterdayDiffGhs = data?.vsYesterdayDiffGhs ?? 0;
  const thisWeekSalesGhs = data?.thisWeekSalesGhs ?? 0;
  const yesterdaySalesGhs = data?.yesterdaySalesGhs ?? 0;
  const topCustomers: TopCustomer[] = data?.topCustomers ?? [];
  const recentSales: RecentSale[] = (data?.recentSales ?? []).slice(0, 5);
  const boughtProducts = ((data?.quickSaleProducts ?? []) as BoughtProduct[])
    .filter((product) => Number(product.qtySold) > 0)
    .slice(0, 6);
  const TrendIcon = vsYesterdayDiffGhs >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F6F8F7] dark:bg-[#0a0a0a]">
      <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(6.5rem,env(safe-area-inset-bottom))] pt-2 lg:px-8 lg:pb-10 lg:pt-6">
        <div className="space-y-3.5 lg:space-y-5">
          <div data-tour-target="home-greeting" data-tour-mount="main">
            <HomeGreeting compact name={firstName} />
          </div>
          <HomeOwnerAlerts />

          <div className="space-y-3.5 lg:grid lg:grid-cols-4 lg:gap-4 lg:space-y-0">
          {isLoading && !data ? (
            <Skeleton className="h-[8.5rem] rounded-2xl lg:col-span-2 lg:h-[10rem]" />
          ) : (
            <Link
              href="/dashboard/sales/revenue"
              className="block overflow-hidden rounded-2xl bg-gradient-to-br from-[#003527] via-[#004d38] to-[#006c49] p-4 text-white shadow-[0_12px_28px_-14px_rgba(0,53,39,0.55)] dark:from-[#06261c] dark:to-[#006c49]/85 lg:col-span-2 lg:flex lg:min-h-[10rem] lg:flex-col lg:justify-between lg:p-6"
              data-tour-target="home-kpis"
              data-tour-mount="main"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                  Today&apos;s sales
                </p>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                  Today
                </span>
              </div>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[2rem] font-semibold leading-none tabular-nums tracking-tight lg:text-[2.75rem]">
                {formatGhs(todaySalesGhs)}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2 text-[12px]">
                <span className="inline-flex items-center gap-1 font-medium text-[#6ffbbe]">
                  <TrendIcon className="size-3.5" aria-hidden />
                  {vsYesterdayPercent > 0 ? "+" : ""}
                  {vsYesterdayPercent}% vs yesterday
                </span>
                <span className="tabular-nums text-white/80">
                  {transactionCount} {transactionCount === 1 ? "sale" : "sales"}
                </span>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-2 lg:contents">
            <div className="rounded-2xl border border-[#d7e0db] bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#111] lg:flex lg:flex-col lg:justify-center lg:px-5 lg:py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7a8c84]">
                Yesterday
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-[#14261e] dark:text-white lg:text-2xl">
                {formatGhs(yesterdaySalesGhs, true)}
              </p>
            </div>
            <Link
              href="/dashboard/sales/overview"
              className="rounded-2xl border border-[#d7e0db] bg-white px-3 py-2.5 dark:border-white/[0.08] dark:bg-[#111] lg:flex lg:flex-col lg:justify-center lg:px-5 lg:py-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7a8c84]">
                This week
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe] lg:text-2xl">
                {formatGhs(thisWeekSalesGhs, true)}
              </p>
            </Link>
          </div>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.7fr)] lg:items-start lg:gap-4">
          <section
            className="overflow-hidden rounded-2xl border border-[#d7e0db] bg-white dark:border-white/[0.08] dark:bg-[#111]"
            data-tour-target="home-quick-sale"
            data-tour-mount="main"
          >
            <div className="px-3.5 py-2.5 lg:px-5 lg:py-3.5">
              <h2 className="text-[13px] font-semibold text-[#14261e] dark:text-white lg:text-sm">
                What people are buying
              </h2>
              <p className="mt-0.5 text-[11px] text-[#7a8c84]">
                From sales in the last 30 days
              </p>
            </div>
            {isLoading && !data ? (
              <div className="space-y-2 px-3.5 pb-3.5">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            ) : boughtProducts.length === 0 ? (
              <p className="px-3.5 pb-4 text-[13px] text-[#7a8c84]">
                No purchases yet. Sold items will show up here.
              </p>
            ) : (
              <ul className="divide-y divide-[#edf1ef] dark:divide-white/[0.06] lg:grid lg:grid-cols-2 lg:gap-px lg:divide-y-0 lg:bg-[#edf1ef] dark:lg:bg-white/[0.06]">
                {boughtProducts.map((product) => (
                  <li key={product.id} className="bg-white dark:bg-[#111]">
                    <button
                      type="button"
                      onClick={() => handleAdd(product)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left active:bg-[#f6f8f7] hover:bg-[#f6f8f7] dark:active:bg-white/[0.04] dark:hover:bg-white/[0.04] lg:px-4 lg:py-3"
                    >
                      {product.imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageSrc}
                          alt=""
                          className="size-10 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                          <Package className="size-4" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#14261e] dark:text-white">
                          {product.name}
                        </span>
                        <span className="text-[11px] text-[#7a8c84]">
                          {product.qtySold} sold
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                        {formatGhs(Number(product.priceGhs))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section data-tour-target="home-mobile-hub" data-tour-mount="main">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7a8c84]">
              Quick actions
            </p>
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1 lg:gap-3">
              {ACTIONS.map((action) => {
                const { href, label, hint, icon: Icon, tone } = action;
                const wide = "wide" in action && action.wide;
                return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 rounded-2xl border border-[#d7e0db] bg-white p-3 active:bg-[#f3f6f4] hover:bg-[#f6f8f7] dark:border-white/[0.08] dark:bg-[#111] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.04] lg:p-3.5 ${
                    wide ? "col-span-2" : ""
                  }`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon className="size-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[#14261e] dark:text-white">
                      {label}
                    </span>
                    <span className="block text-[11px] text-[#7a8c84]">{hint}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[#9aaba3]" aria-hidden />
                </Link>
                );
              })}
            </div>
          </section>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-2 lg:items-start lg:gap-4">
          <section className="overflow-hidden rounded-2xl border border-[#d7e0db] bg-white dark:border-white/[0.08] dark:bg-[#111]">
            <div className="flex items-center justify-between px-3.5 py-2.5 lg:px-5 lg:py-3.5">
              <h2 className="text-[13px] font-semibold text-[#14261e] dark:text-white lg:text-sm">
                Regular customers
              </h2>
              <Link
                href="/dashboard/customers"
                className="text-[12px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
              >
                View all
              </Link>
            </div>
            {topCustomers.length === 0 ? (
              <p className="px-3.5 pb-4 text-[13px] text-[#7a8c84]">
                No regulars yet. Attach a customer on the next sale.
              </p>
            ) : (
              <ul className="divide-y divide-[#edf1ef] dark:divide-white/[0.06]">
                {topCustomers.map((customer, index) => (
                  <li key={customer.id}>
                    <Link
                      href={`/dashboard/customers/${customer.id}`}
                      className="flex items-center gap-3 px-3.5 py-2.5 active:bg-[#f6f8f7] dark:active:bg-white/[0.04]"
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
                      >
                        {initials(customer.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-[#14261e] dark:text-white">
                          {customer.name}
                        </span>
                        <span className="text-[11px] text-[#7a8c84]">
                          {customer.orderCount}{" "}
                          {customer.orderCount === 1 ? "order" : "orders"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                        {formatGhs(customer.spentGhs, true)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#d7e0db] bg-white dark:border-white/[0.08] dark:bg-[#111]">
            <div className="flex items-center justify-between px-3.5 py-2.5 lg:px-5 lg:py-3.5">
              <h2 className="text-[13px] font-semibold text-[#14261e] dark:text-white lg:text-sm">
                Recent activity
              </h2>
              <Link
                href="/dashboard/sales/transactions"
                className="text-[12px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
              >
                View all
              </Link>
            </div>
            {recentSales.length === 0 ? (
              <p className="px-3.5 pb-4 text-[13px] text-[#7a8c84]">
                No sales yet today. Tap New sale to start.
              </p>
            ) : (
              <ul className="divide-y divide-[#edf1ef] dark:divide-white/[0.06]">
                {recentSales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[#14261e] dark:text-white">
                        Sale #{sale.invoiceId}
                      </span>
                      <span className="text-[11px] text-[#7a8c84]">
                        {formatTime(sale.createdAt)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                      {formatGhs(sale.totalGhs)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          </div>
        </div>
      </div>

      <HomeVariationModal
        product={variationProduct}
        onClose={() => setVariationProduct(null)}
        onSelect={(productId, variationId) => {
          const product = boughtProducts.find((item) => item.id === productId);
          if (product) handleAdd(product, variationId);
        }}
      />
    </div>
  );
}
