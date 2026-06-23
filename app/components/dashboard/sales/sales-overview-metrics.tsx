"use client";

import useSWR from "swr";
import { ArrowDownRight, ArrowUpRight, DollarSign, Receipt, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useSalesOverviewDate } from "./sales-overview-date-context";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type OverviewMetric = {
    label: string;
    value: number;
    trend: number;
    timeframe: string;
};

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

export function SalesOverviewMetrics() {
    const { overviewUrl } = useSalesOverviewDate();
    const { data, isLoading } = useSWR(overviewUrl, fetcher);
    const metrics: OverviewMetric[] = data?.metrics ?? [];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-muted/50" />
                ))}
            </div>
        );
    }

    if (metrics.length === 0) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                    { label: "Total Revenue", icon: DollarSign, href: "/dashboard/sales/revenue" },
                    { label: "Total Transactions", icon: Receipt, href: "/dashboard/sales/transactions" },
                    { label: "Average Order Value", icon: ShoppingCart, href: "/dashboard/sales/average-order-value" },
                ].map((m) => {
                    const Icon = m.icon;
                    return (
                        <Link
                            key={m.label}
                            href={m.href}
                            className="group flex flex-col rounded-2xl border border-[#eef0f2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:border-[#006c49]/30 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/30"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[14px] font-medium text-muted-foreground">{m.label}</span>
                                <span className="flex size-9 items-center justify-center rounded-xl bg-[#f4f4f5] text-foreground dark:bg-[#1a1a1a]">
                                    <Icon className="size-4" strokeWidth={2} />
                                </span>
                            </div>
                            <div className="mt-4">
                                <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-foreground">
                                    {m.label === "Total Transactions" ? "0" : "GH₵0.00"}
                                </span>
                                <p className="mt-1 text-[12px] text-muted-foreground">No sales yet</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    }

    const ICONS = [DollarSign, Receipt, ShoppingCart];
    const HREFS = ["/dashboard/sales/revenue", "/dashboard/sales/transactions", "/dashboard/sales/average-order-value"];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric, i) => {
                const isPositive = metric.trend > 0;
                const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
                const Icon = ICONS[i] ?? DollarSign;
                const href = HREFS[i] ?? "/dashboard/sales/overview";

                return (
                    <Link
                        key={metric.label}
                        href={href}
                        className="group flex flex-col rounded-2xl border border-[#eef0f2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:border-[#006c49]/30 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/30"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[14px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{metric.label}</span>
                            <span className="flex size-9 items-center justify-center rounded-xl bg-[#f4f4f5] text-foreground transition-colors group-hover:bg-[#006c49] group-hover:text-white dark:bg-[#1a1a1a] dark:group-hover:bg-[#6ffbbe] dark:group-hover:text-black">
                                <Icon className="size-4" strokeWidth={2} aria-hidden />
                            </span>
                        </div>

                        <div className="mt-4 flex flex-col gap-1">
                            <span className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums text-foreground">
                                {metric.label === "Total Transactions"
                                    ? metric.value.toLocaleString()
                                    : formatGhs(metric.value)}
                            </span>
                            <div className="flex items-center gap-2">
                                {metric.trend !== 0 && (
                                    <span
                                        className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-semibold tracking-wide ${isPositive
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                            : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                                            }`}
                                    >
                                        <TrendIcon className="size-3" strokeWidth={2.5} aria-hidden />
                                        {Math.abs(metric.trend)}%
                                    </span>
                                )}
                                <span className="text-[12px] text-muted-foreground">{metric.timeframe}</span>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
