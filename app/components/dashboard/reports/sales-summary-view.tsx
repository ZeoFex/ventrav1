"use client";

import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Printer, Download, Loader2, ChevronDown, Table as TableIcon, FileText } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { SalesTrendChart, PaymentMethodsChart } from "./reports-charts";
import { useBranchContext } from "../branch-context";
import { useState } from "react";
import { exportToExcel, exportToCSV } from "@/app/utils/export-utils";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function SalesSummaryView() {
    const { branchId } = useBranchContext();
    const { data, isLoading } = useSWR(`/api/reports/sales-summary?period=30&b=${branchId}`, fetcher);
    const [exportOpen, setExportOpen] = useState(false);

    if (isLoading) {
        return (
            <ProductsPageShell
                title="Sales Summary"
                description="Comprehensive analysis of your gross sales, profit margins, and performance."
                actions={<div />}
            >
                <div className="flex w-full h-[400px] items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (!data) return null;

    const { kpis, salesTrend, paymentMethods, topItems, categoryPerformance } = data;

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
        ];

        await exportToExcel({
            data: kpiData,
            columns,
            filename: `sales_summary_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: "Sales Metrics"
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

        exportToCSV(kpiData, columns, `sales_summary_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <ProductsPageShell
            title="Sales Summary"
            description="Comprehensive analysis of your gross sales, profit margins, and performance."
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/reports"
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <Printer className="size-4" />
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-105"
                        >
                            <Download className="size-4" />
                            Export Data
                            <ChevronDown className={`size-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
                        </button>

                        {exportOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-1.5 shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                                    <button
                                        onClick={handleExportExcel}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <TableIcon className="size-4 text-emerald-600" />
                                        Export as Excel
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <FileText className="size-4 text-blue-600" />
                                        Export as CSV
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-6 print-container">
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
                    <KpiCard title="Gross Sales" value={formatGhs(kpis.grossSales)} trend="+13.5%" trendType="up" href="/dashboard/sales/revenue" />
                    <KpiCard title="Discounts" value={formatGhs(kpis.discounts)} trend="-1.2%" trendType="down" href="/dashboard/sales/revenue" />
                    <KpiCard title="Net Sales" value={formatGhs(kpis.netSales)} trend="+16.4%" trendType="up" highlight href="/dashboard/sales/revenue" />
                    <KpiCard title="Total COGS" value={formatGhs(kpis.totalCogs)} trend="+3.1%" trendType="up" href="/dashboard/finance/pnl" />
                    <KpiCard title="Gross Profit" value={formatGhs(kpis.grossProfit)} trend="+18.7%" trendType="up" highlight href="/dashboard/finance/pnl" />
                    <KpiCard title="Transactions" value={kpis.transactionCount.toString()} trend="+4.0%" trendType="up" href="/dashboard/sales/transactions" />
                </div>

                {/* Charts Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="h-[400px] lg:col-span-2">
                        <SalesTrendChart data={salesTrend} />
                    </div>
                    <div className="h-[400px] lg:col-span-1">
                        <PaymentMethodsChart data={paymentMethods} />
                    </div>
                </div>

                {/* Tables Grid */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Top Items */}
                    <div className="flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                            Top Selling Items
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px] whitespace-nowrap">
                                <thead className="border-b border-[#f0f2f4] text-[12px] uppercase tracking-wide text-muted-foreground dark:border-white/[0.04]">
                                    <tr>
                                        <th className="pb-3 font-semibold">Item Name</th>
                                        <th className="pb-3 font-semibold text-right">Qty Sold</th>
                                        <th className="pb-3 font-semibold text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                    {topItems.length > 0 ? topItems.map((item: any) => (
                                        <tr key={item.id}>
                                            <td className="py-3 font-medium text-foreground">{item.name}</td>
                                            <td className="py-3 text-right text-muted-foreground">{item.qty}</td>
                                            <td className="py-3 text-right font-[family-name:var(--font-display)] font-semibold text-foreground">
                                                {formatGhs(item.revenue)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-muted-foreground">No items sold yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Category Perf */}
                    <div className="flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                            Sales by Category
                        </h3>
                        <div className="space-y-4">
                            {categoryPerformance.length > 0 ? categoryPerformance.map((cat: any) => (
                                <div key={cat.category} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[14px]">
                                        <span className="font-medium text-foreground">{cat.category}</span>
                                        <span className="font-[family-name:var(--font-display)] font-semibold text-foreground">
                                            {formatGhs(cat.sales)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f4f5f7] dark:bg-white/[0.04]">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#006c49] to-[#6ffbbe] dark:from-[#006c49] dark:to-[#6ffbbe]"
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                        <span className="w-10 text-right text-[12px] font-semibold text-muted-foreground">
                                            {cat.percentage}%
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <p className="py-8 text-center text-[13px] text-muted-foreground">No categories mapped yet.</p>
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
    trendType,
    highlight = false,
    href,
}: {
    title: string;
    value: string;
    trend?: string;
    trendType?: "up" | "down";
    highlight?: boolean;
    href: string;
}) {
    return (
        <Link
            href={href}
            className={`relative flex flex-col rounded-[1.25rem] border p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-md ${highlight
                ? "border-[#006c49]/30 bg-[#006c49]/04 dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/05 shadow-sm"
                : "border-[#eef0f2] bg-surface-card dark:border-white/[0.08] dark:bg-[#111] hover:border-[#006c49]/20"
                }`}
        >
            <div className="mb-2.5 flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap group-hover:text-foreground">
                    {title}
                </span>
                {trend && (
                    <div
                        className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${trendType === "up"
                            ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                    >
                        {trendType === "up" ? <ArrowUpRight className="size-3" strokeWidth={3} /> : <ArrowDownRight className="size-3" strokeWidth={3} />}
                        {trend}
                    </div>
                )}
            </div>
            <span className={`font-[family-name:var(--font-display)] text-[22px] font-bold tracking-tight text-foreground truncate ${highlight ? "text-[#006c49] dark:text-[#6ffbbe]" : ""}`}>
                {value}
            </span>
        </Link>
    );
}
