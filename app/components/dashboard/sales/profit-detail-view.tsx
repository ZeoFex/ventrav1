"use client";
import useSWR from "swr";
import { SalesDetailLayout } from "./sales-detail-layout";
import { TrendingUp, ArrowUpRight, Loader2, Printer, Download, ChevronDown, Table as TableIcon, FileText } from "lucide-react";
import { useState } from "react";
import { exportToExcel, exportToCSV } from "@/app/utils/export-utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

export function ProfitDetailView() {
    const { data, isLoading } = useSWR("/api/sales/profit", fetcher);
    const [exportOpen, setExportOpen] = useState(false);

    if (isLoading) {
        return (
            <SalesDetailLayout title="Net Profit" description="Analysis of your actual earnings after accounting for Cost of Goods Sold (COGS).">
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                </div>
            </SalesDetailLayout>
        );
    }

    const stats = data || {
        revenue: 0,
        cogs: 0,
        netProfit: 0,
        profitMargin: 0,
        categories: [],
        topItem: null,
    };

    const handleExportExcel = async () => {
        setExportOpen(false);
        const columns = [
            { header: "Category", key: "label", width: 30 },
            { header: "Revenue (GHS)", key: "revenue", width: 20, isCurrency: true },
            { header: "Cost (GHS)", key: "cost", width: 20, isCurrency: true },
            { header: "Profit (GHS)", key: "profit", width: 20, isCurrency: true },
            { header: "Margin (%)", key: "margin", width: 15 },
        ];

        const exportData = stats.categories.map((cat: any) => ({
            label: cat.label,
            revenue: cat.revenue,
            cost: cat.cost,
            profit: cat.revenue - cat.cost,
            margin: `${cat.margin.toFixed(1)}%`
        }));

        await exportToExcel({
            data: exportData,
            columns,
            filename: `profit_report_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: "Profit Analysis"
        });
    };

    const handleExportCSV = () => {
        setExportOpen(false);
        const columns = [
            { header: "Category", key: "label" },
            { header: "Revenue", key: "revenue" },
            { header: "Cost", key: "cost" },
            { header: "Net Profit", key: "profit" },
            { header: "Margin %", key: "margin" },
        ];

        const exportData = stats.categories.map((cat: any) => ({
            label: cat.label,
            revenue: cat.revenue,
            cost: cat.cost,
            profit: cat.revenue - cat.cost,
            margin: cat.margin.toFixed(2)
        }));

        exportToCSV(exportData, columns, `profit_report_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <SalesDetailLayout
            title="Net Profit"
            description="Analysis of your actual earnings after accounting for Cost of Goods Sold (COGS)."
            actions={
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 rounded-xl border border-[#eef0f2] bg-white px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted/50 dark:border-white/[0.08] dark:bg-[#111]"
                    >
                        <Printer className="size-4" />
                        Print
                    </button>
                    <div className="relative">
                        <button
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2 text-[13px] font-semibold text-white shadow-lg hover:brightness-110"
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
            <div className="grid gap-6 print-container">
                {/* KPI ROW */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailKpi label="Gross Revenue" value={formatGhs(stats.revenue)} />
                    <DetailKpi label="Total COGS" value={formatGhs(stats.cogs)} color="red" />
                    <DetailKpi label="Net Profit" value={formatGhs(stats.netProfit)} highlight />
                    <DetailKpi label="Profit Margin" value={`${stats.profitMargin.toFixed(1)}%`} />
                </div>

                {/* MARGIN BREAKDOWN */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-6 font-semibold text-foreground">Profitability by Product Category</h3>
                        <div className="space-y-6">
                            {stats.categories.length > 0 ? (
                                stats.categories.map((cat: any) => (
                                    <CategoryProfit
                                        key={cat.label}
                                        label={cat.label}
                                        revenue={formatGhs(cat.revenue)}
                                        cost={formatGhs(cat.cost)}
                                        margin={cat.margin}
                                    />
                                ))
                            ) : (
                                <p className="text-center text-sm text-muted-foreground py-10">No category data available yet.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="mb-4 font-semibold text-foreground">Margin Summary</h3>
                            <p className="text-[13px] leading-relaxed text-muted-foreground">
                                Your current average profit margin is <strong>{stats.profitMargin.toFixed(1)}%</strong>.
                                Keep an eye on category costs to optimize your net earnings.
                            </p>
                        </div>
                        {stats.topItem && (
                            <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                                <h3 className="mb-4 font-semibold text-foreground">Top Profitable Item</h3>
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                        <TrendingUp className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-medium text-foreground">{stats.topItem.name}</p>
                                        <p className="text-[12px] text-muted-foreground">{stats.topItem.margin.toFixed(0)}% Margin</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SalesDetailLayout>
    );
}

function DetailKpi({ label, value, color, highlight, trend }: { label: string; value: string; color?: string; highlight?: boolean; trend?: string }) {
    return (
        <div className={`rounded-xl border border-[#eef0f2] p-4 dark:border-white/[0.06] ${highlight ? 'bg-[#006c49]/05 border-[#006c49]/30 dark:bg-[#6ffbbe]/05 dark:border-[#6ffbbe]/30' : 'bg-white dark:bg-[#111]'}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <div className="mt-2 flex items-baseline justify-between">
                <h4 className={`font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight ${color === 'red' ? 'text-red-600' : highlight ? 'text-[#006c49] dark:text-[#6ffbbe]' : 'text-foreground'}`}>
                    {value}
                </h4>
                {trend && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#006c49] dark:text-[#6ffbbe]">
                        <ArrowUpRight className="size-3" strokeWidth={3} />
                        {trend}
                    </span>
                )}
            </div>
        </div>
    )
}

function CategoryProfit({ label, revenue, cost, margin }: { label: string; revenue: string; cost: string; margin: number }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[14px] font-semibold text-foreground">{label}</p>
                    <p className="text-[12px] text-muted-foreground">Rev: {revenue} | Cost: {cost}</p>
                </div>
                <div className="text-right">
                    <p className="text-[14px] font-bold text-[#006c49] dark:text-[#6ffbbe]">{margin.toFixed(1)}%</p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Margin</p>
                </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div className="h-full bg-gradient-to-r from-[#006c49] to-[#6ffbbe]" style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
            </div>
        </div>
    )
}
