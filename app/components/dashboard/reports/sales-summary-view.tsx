"use client";

import Link from "next/link";
import useSWR from "swr";
import {
    ArrowLeft,
    ArrowDownRight,
    ArrowUpRight,
    Printer,
    Download,
    Loader2,
    ChevronDown,
    Table as TableIcon,
    FileText,
} from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import {
    CategoryPerformanceChart,
    DailyRevenueChart,
    HourlySalesChart,
    PaymentMethodsChart,
    ProfitMarginComboChart,
    TopProductsChart,
} from "./reports-charts";
import { ReportsInsightsPanel } from "./reports-insights-panel";
import { useBranchContext } from "../branch-context";
import { useState } from "react";
import { exportToExcel, exportToCSV } from "@/app/utils/export-utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PERIOD_OPTIONS = [
    { days: 7, label: "7 days" },
    { days: 30, label: "30 days" },
    { days: 90, label: "90 days" },
];

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function SalesSummaryView() {
    const { branchId } = useBranchContext();
    const [periodDays, setPeriodDays] = useState(30);
    const [exportOpen, setExportOpen] = useState(false);

    const { data, isLoading } = useSWR(
        `/api/reports/sales-summary?period=${periodDays}&b=${branchId}`,
        fetcher,
    );

    if (isLoading) {
        return (
            <ProductsPageShell
                title="Sales Summary"
                description="Comprehensive analysis of your gross sales, profit margins, and performance."
                actions={<div />}
            >
                <div className="flex h-[400px] w-full items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (!data) return null;

    const {
        kpis,
        trends = {},
        insights = [],
        dailyTrend = [],
        salesTrend = [],
        paymentMethods = [],
        topItems = [],
        categoryPerformance = [],
        period,
    } = data;

    const profitTrendData = dailyTrend.map((d: { date: string; sales: number }) => ({
        date: d.date,
        sales: d.sales,
        profit: kpis.netSales > 0 ? Math.round(d.sales * (kpis.grossProfit / kpis.netSales)) : 0,
    }));

    const handleExportExcel = async () => {
        setExportOpen(false);
        const columns = [
            { header: "Metric", key: "metric", width: 30 },
            { header: "Value", key: "value", width: 25 },
        ];
        const kpiData = [
            { metric: "Gross Sales", value: kpis.grossSales },
            { metric: "Discounts", value: kpis.discounts },
            { metric: "Net Sales", value: kpis.netSales },
            { metric: "Total COGS", value: kpis.totalCogs },
            { metric: "Gross Profit", value: kpis.grossProfit },
            { metric: "Margin %", value: `${kpis.marginPercent.toFixed(1)}%` },
            { metric: "Transactions", value: kpis.transactionCount },
            { metric: "Avg Order Value", value: kpis.avgOrderValue },
        ];
        await exportToExcel({
            data: kpiData,
            columns,
            filename: `sales_summary_${new Date().toISOString().split("T")[0]}.xlsx`,
            sheetName: "Sales Metrics",
        });
    };

    const handleExportCSV = () => {
        setExportOpen(false);
        const columns = [
            { header: "Metric", key: "metric" },
            { header: "Value", key: "value" },
        ];
        const kpiData = [
            { metric: "Gross Sales", value: kpis.grossSales },
            { metric: "Net Sales", value: kpis.netSales },
            { metric: "Gross Profit", value: kpis.grossProfit },
            { metric: "Margin %", value: kpis.marginPercent },
        ];
        exportToCSV(kpiData, columns, `sales_summary_${new Date().toISOString().split("T")[0]}.csv`);
    };

    return (
        <ProductsPageShell
            title="Sales Summary"
            description="Comprehensive analysis of your gross sales, profit margins, and performance."
            actions={
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/dashboard/reports"
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="flex rounded-xl border border-[#eef0f2] bg-white p-1 dark:border-white/[0.08] dark:bg-[#111]">
                        {PERIOD_OPTIONS.map((opt) => (
                            <button
                                key={opt.days}
                                type="button"
                                onClick={() => setPeriodDays(opt.days)}
                                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                                    periodDays === opt.days
                                        ? "bg-[#006c49] text-white"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <Printer className="size-4" />
                    </button>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-105"
                        >
                            <Download className="size-4" />
                            Export
                            <ChevronDown
                                className={`size-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {exportOpen ? (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-1.5 shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                                    <button
                                        type="button"
                                        onClick={() => void handleExportExcel()}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium hover:bg-muted/50"
                                    >
                                        <TableIcon className="size-4 text-emerald-600" />
                                        Excel (.xlsx)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleExportCSV}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium hover:bg-muted/50"
                                    >
                                        <FileText className="size-4 text-blue-600" />
                                        CSV (.csv)
                                    </button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-6 print-container">
                <p className="text-[13px] text-muted-foreground">
                    Reporting period: <span className="font-medium text-foreground">{period?.label ?? `Last ${periodDays} days`}</span>
                </p>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
                    <KpiCard title="Gross Sales" value={formatGhs(kpis.grossSales)} trend={trends.grossSales} href="/dashboard/sales/revenue" />
                    <KpiCard title="Discounts" value={formatGhs(kpis.discounts)} trend={trends.discounts} invertTrend href="/dashboard/sales/revenue" />
                    <KpiCard title="Net Sales" value={formatGhs(kpis.netSales)} trend={trends.netSales} highlight href="/dashboard/sales/revenue" />
                    <KpiCard title="COGS" value={formatGhs(kpis.totalCogs)} trend={trends.totalCogs} invertTrend href="/dashboard/finance/pnl" />
                    <KpiCard title="Gross Profit" value={formatGhs(kpis.grossProfit)} trend={trends.grossProfit} highlight href="/dashboard/finance/pnl" />
                    <KpiCard title="Margin" value={`${kpis.marginPercent.toFixed(1)}%`} trend={trends.marginPercent} href="/dashboard/finance/pnl" />
                    <KpiCard title="Transactions" value={kpis.transactionCount.toLocaleString()} trend={trends.transactionCount} href="/dashboard/sales/transactions" />
                    <KpiCard title="Avg Order" value={formatGhs(kpis.avgOrderValue ?? 0)} trend={trends.avgOrderValue} href="/dashboard/sales/overview" />
                </div>

                <ReportsInsightsPanel insights={insights} />

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <DailyRevenueChart data={dailyTrend} periodLabel={period?.label} />
                    </div>
                    <div>
                        <PaymentMethodsChart data={paymentMethods} />
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <ProfitMarginComboChart data={profitTrendData} />
                    <HourlySalesChart data={salesTrend} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <TopProductsChart data={topItems} />
                    <CategoryPerformanceChart data={categoryPerformance} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                            Top selling items
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px] whitespace-nowrap">
                                <thead className="border-b border-[#f0f2f4] text-[12px] uppercase tracking-wide text-muted-foreground dark:border-white/[0.04]">
                                    <tr>
                                        <th className="pb-3 font-semibold">Item</th>
                                        <th className="pb-3 text-right font-semibold">Qty</th>
                                        <th className="pb-3 text-right font-semibold">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                    {topItems.length > 0 ? (
                                        topItems.map((item: { id: string; name: string; qty: number; revenue: number }) => (
                                            <tr key={item.id}>
                                                <td className="py-3 font-medium text-foreground">{item.name}</td>
                                                <td className="py-3 text-right text-muted-foreground">{item.qty}</td>
                                                <td className="py-3 text-right font-[family-name:var(--font-display)] font-semibold">
                                                    {formatGhs(item.revenue)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                                                No items sold yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                            Category breakdown
                        </h3>
                        <div className="space-y-4">
                            {categoryPerformance.length > 0 ? (
                                categoryPerformance.map((cat: { category: string; sales: number; percentage: number }) => (
                                    <div key={cat.category} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between text-[14px]">
                                            <span className="font-medium text-foreground">{cat.category}</span>
                                            <span className="font-[family-name:var(--font-display)] font-semibold">
                                                {formatGhs(cat.sales)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f4f5f7] dark:bg-white/[0.04]">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-[#006c49] to-[#6ffbbe]"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                            <span className="w-10 text-right text-[12px] font-semibold text-muted-foreground">
                                                {cat.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="py-8 text-center text-[13px] text-muted-foreground">
                                    No categories mapped yet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}

function KpiCard({
    title,
    value,
    trend,
    invertTrend = false,
    highlight = false,
    href,
}: {
    title: string;
    value: string;
    trend?: number;
    invertTrend?: boolean;
    highlight?: boolean;
    href: string;
}) {
    const isPositive = invertTrend ? (trend ?? 0) < 0 : (trend ?? 0) > 0;
    const isNegative = invertTrend ? (trend ?? 0) > 0 : (trend ?? 0) < 0;

    return (
        <Link
            href={href}
            className={`relative flex flex-col rounded-[1.25rem] border p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-md ${
                highlight
                    ? "border-[#006c49]/30 bg-[#006c49]/04 dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/05"
                    : "border-[#eef0f2] bg-surface-card dark:border-white/[0.08] dark:bg-[#111]"
            }`}
        >
            <div className="mb-2 flex items-start justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
                {trend !== undefined && trend !== 0 ? (
                    <div
                        className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                            isPositive
                                ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                                : isNegative
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                        }`}
                    >
                        {isPositive ? (
                            <ArrowUpRight className="size-2.5" strokeWidth={3} />
                        ) : (
                            <ArrowDownRight className="size-2.5" strokeWidth={3} />
                        )}
                        {trend > 0 ? "+" : ""}
                        {trend.toFixed(1)}%
                    </div>
                ) : null}
            </div>
            <span
                className={`truncate font-[family-name:var(--font-display)] text-[18px] font-bold tracking-tight ${
                    highlight ? "text-[#006c49] dark:text-[#6ffbbe]" : "text-foreground"
                }`}
            >
                {value}
            </span>
        </Link>
    );
}
