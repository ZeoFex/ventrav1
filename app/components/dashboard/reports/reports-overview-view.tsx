"use client";

import Link from "next/link";
import useSWR from "swr";
import { ProductsPageShell } from "../products/products-page-shell";
import { TrendingUp, Package, Calculator, Clock, BarChart3, Loader2, ArrowRight } from "lucide-react";
import { useBranchContext } from "../branch-context";
import { MiniSparkline, formatReportGhs } from "./reports-charts";
import { TrendBadge } from "./reports-insights-panel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const REPORTS = [
    {
        title: "Sales Summary",
        description: "Gross sales, margins, payment mix, and daily revenue charts.",
        icon: TrendingUp,
        href: "/dashboard/reports/sales-summary",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Product Report",
        description: "Product-level sales, stock movement, and category analytics.",
        icon: BarChart3,
        href: "/dashboard/reports/product-report",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "End of Day (Z-Report)",
        description: "Daily register closures, cash drawer discrepancies, and shift totals.",
        icon: Clock,
        href: "/dashboard/reports/z-report",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Inventory Valuation",
        description: "Stock worth, category valuation charts, and low-stock alerts.",
        icon: Package,
        href: "/dashboard/reports/inventory-valuation",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
    {
        title: "Tax Liabilities",
        description: "Collected taxes, levy breakdown, and daily filing trends.",
        icon: Calculator,
        href: "/dashboard/reports/taxes",
        colorClass: "bg-[#006c49]/08 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]",
    },
];

export function ReportsOverviewView() {
    const { branchId } = useBranchContext();
    const { data: sales, isLoading } = useSWR(
        `/api/reports/sales-summary?period=30&b=${branchId}`,
        fetcher,
    );
    const { data: inventory } = useSWR(
        `/api/reports/inventory-valuation?b=${branchId}`,
        fetcher,
    );

    const kpis = sales?.kpis;
    const trends = sales?.trends ?? {};
    const dailyTrend = sales?.dailyTrend ?? [];

    return (
        <ProductsPageShell
            title="Report Center"
            description="Real-time analytics, charts, and insights across your business."
        >
            <div className="mb-8 flex flex-col gap-4">
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center rounded-[1.25rem] border border-[#eef0f2] bg-surface-card dark:border-white/[0.08] dark:bg-[#111]">
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                ) : kpis ? (
                    <div className="rounded-[1.25rem] border border-[#006c49]/20 bg-gradient-to-br from-[#006c49]/06 via-transparent to-[#6ffbbe]/04 p-5 dark:border-[#6ffbbe]/20 dark:from-[#6ffbbe]/08 dark:to-transparent">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    30-day snapshot
                                </p>
                                <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
                                    Business performance at a glance
                                </h2>
                            </div>
                            <Link
                                href="/dashboard/reports/sales-summary"
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
                            >
                                Full sales report
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                            <SnapshotKpi
                                label="Net sales"
                                value={formatReportGhs(kpis.netSales)}
                                trend={trends.netSales}
                                sparkline={dailyTrend}
                                dataKey="sales"
                            />
                            <SnapshotKpi
                                label="Gross profit"
                                value={formatReportGhs(kpis.grossProfit)}
                                trend={trends.grossProfit}
                            />
                            <SnapshotKpi
                                label="Margin"
                                value={`${kpis.marginPercent.toFixed(1)}%`}
                                trend={trends.marginPercent}
                            />
                            <SnapshotKpi
                                label="Transactions"
                                value={kpis.transactionCount.toLocaleString()}
                                trend={trends.transactionCount}
                            />
                            <SnapshotKpi
                                label="Stock value"
                                value={
                                    inventory?.summary
                                        ? formatReportGhs(inventory.summary.retailValue)
                                        : "—"
                                }
                                subtitle={
                                    inventory?.summary?.lowStockCount
                                        ? `${inventory.summary.lowStockCount} low stock`
                                        : undefined
                                }
                            />
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORTS.map((report) => (
                    <Link
                        key={report.title}
                        href={report.href}
                        className="group flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-[#006c49]/30 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/30"
                    >
                        <div className={`mb-4 flex size-12 items-center justify-center rounded-xl ${report.colorClass}`}>
                            <report.icon className="size-6" />
                        </div>
                        <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg font-bold text-foreground">
                            {report.title}
                        </h3>
                        <p className="text-[13px] leading-relaxed text-muted-foreground">{report.description}</p>
                        <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-[#006c49] opacity-0 transition-opacity group-hover:opacity-100 dark:text-[#6ffbbe]">
                            Open report <ArrowRight className="size-3.5" />
                        </span>
                    </Link>
                ))}
            </div>
        </ProductsPageShell>
    );
}

function SnapshotKpi({
    label,
    value,
    trend,
    subtitle,
    sparkline,
    dataKey = "sales",
}: {
    label: string;
    value: string;
    trend?: number;
    subtitle?: string;
    sparkline?: { [k: string]: number | string }[];
    dataKey?: string;
}) {
    return (
        <div className="rounded-xl border border-[#eef0f2]/80 bg-white/80 p-4 backdrop-blur-sm dark:border-white/[0.06] dark:bg-[#111]/80">
            <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                <TrendBadge value={trend} />
            </div>
            <p className="font-[family-name:var(--font-display)] text-[20px] font-bold text-foreground">{value}</p>
            {subtitle ? <p className="mt-0.5 text-[11px] text-amber-600">{subtitle}</p> : null}
            {sparkline && sparkline.length > 1 ? (
                <div className="mt-2 h-10">
                    <MiniSparkline data={sparkline} dataKey={dataKey} />
                </div>
            ) : null}
        </div>
    );
}
