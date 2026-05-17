"use client";

import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
    TrendingUp,
    ArrowUpRight,
    Loader2,
    Printer,
    Download,
    ChevronDown,
    Table as TableIcon,
    FileText,
} from "lucide-react";
import { SalesDetailLayout } from "./sales-detail-layout";
import { ProductsPageShell } from "@/app/components/dashboard/products/products-page-shell";
import { useBranchContext } from "@/app/components/dashboard/branch-context";
import { exportToExcel, exportToCSV } from "@/app/utils/export-utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

function defaultFromIso(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("en-CA");
}

function defaultToIso(): string {
    return new Date().toLocaleDateString("en-CA");
}

const EMPTY_STATS = {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    netOperatingProfit: 0,
    netOperatingMargin: 0,
    netProfit: 0,
    profitMargin: 0,
    categories: [] as any[],
    topItem: null as null | { name: string; margin: number },
};

export type ProfitDetailViewProps = {
    variant?: "sales" | "finance";
};

export function ProfitDetailView({ variant = "sales" }: ProfitDetailViewProps) {
    const { branchId } = useBranchContext();
    const [from, setFrom] = useState(defaultFromIso);
    const [to, setTo] = useState(defaultToIso);
    const [exportOpen, setExportOpen] = useState(false);

    const profitUrl = useMemo(() => {
        const q = new URLSearchParams();
        if (branchId && branchId !== "all") q.set("b", branchId);
        if (from) q.set("from", from);
        if (to) q.set("to", to);
        const s = q.toString();
        return s ? `/api/sales/profit?${s}` : "/api/sales/profit";
    }, [branchId, from, to]);

    const { data, isLoading } = useSWR(profitUrl, fetcher);

    const stats = data && !data.error ? data : EMPTY_STATS;

    const grossProfit = Number(stats.grossProfit ?? stats.netProfit ?? 0);
    const operatingExpenses = Number(stats.operatingExpenses ?? 0);
    const netOperatingProfit = Number(
        stats.netOperatingProfit ?? grossProfit - operatingExpenses,
    );
    const netOperatingMargin = Number(
        stats.netOperatingMargin ??
            (stats.revenue > 0 ? (netOperatingProfit / stats.revenue) * 100 : 0),
    );

    const description =
        "Revenue, cost of goods sold (from each product’s cost price), paid operating expenses, and margins for the selected period. COGS uses the current cost per unit on the product.";

    function handleExportExcel() {
        setExportOpen(false);
        const columns = [
            { header: "Category", key: "label", width: 30 },
            { header: "Revenue (GHS)", key: "revenue", width: 20, isCurrency: true },
            { header: "COGS (GHS)", key: "cost", width: 20, isCurrency: true },
            { header: "Gross profit (GHS)", key: "profit", width: 20, isCurrency: true },
            { header: "Margin (%)", key: "margin", width: 15 },
        ];

        const exportData = stats.categories.map((cat: any) => ({
            label: cat.label,
            revenue: cat.revenue,
            cost: cat.cost,
            profit: cat.revenue - cat.cost,
            margin: `${cat.margin.toFixed(1)}%`,
        }));

        const tag = `${from}_${to}`;
        void exportToExcel({
            data: exportData,
            columns,
            filename: `pnl_${tag}.xlsx`,
            sheetName: "P&L categories",
        });
    }

    function handleExportCSV() {
        setExportOpen(false);
        const columns = [
            { header: "Category", key: "label" },
            { header: "Revenue", key: "revenue" },
            { header: "COGS", key: "cost" },
            { header: "Gross profit", key: "profit" },
            { header: "Margin %", key: "margin" },
        ];

        const exportData = stats.categories.map((cat: any) => ({
            label: cat.label,
            revenue: cat.revenue,
            cost: cat.cost,
            profit: cat.revenue - cat.cost,
            margin: cat.margin.toFixed(2),
        }));

        exportToCSV(exportData, columns, `pnl_${from}_${to}.csv`);
    }

    const periodControls = (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#eef0f2] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111] sm:flex-row sm:flex-wrap sm:items-end">
            <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    From
                </label>
                <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-xl border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] dark:border-white/10"
                />
            </div>
            <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    To
                </label>
                <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-xl border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] dark:border-white/10"
                />
            </div>
            <p className="text-[12px] text-muted-foreground sm:pb-2 sm:pl-2">
                Sales filtered by checkout time; expenses use the expense date ({""}
                <strong>paid</strong> only).
            </p>
        </div>
    );

    const exportActions = (
        <div className="flex flex-wrap items-center gap-3">
            {variant === "finance" ? (
                <Link
                    href="/dashboard/finance/expenses"
                    className="rounded-xl border border-[#eef0f2] bg-white px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted/50 dark:border-white/[0.08] dark:bg-[#111]"
                >
                    Expenses
                </Link>
            ) : null}
            <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-[#eef0f2] bg-white px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-muted/50 dark:border-white/[0.08] dark:bg-[#111]"
            >
                <Printer className="size-4" />
                Print
            </button>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setExportOpen(!exportOpen)}
                    className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2 text-[13px] font-semibold text-white shadow-lg hover:brightness-110"
                >
                    <Download className="size-4" />
                    Export
                    <ChevronDown
                        className={`size-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`}
                    />
                </button>

                {exportOpen ? (
                    <>
                        <button
                            type="button"
                            className="fixed inset-0 z-40 cursor-default"
                            aria-label="Close export menu"
                            onClick={() => setExportOpen(false)}
                        />
                        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-1.5 shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
                            >
                                <TableIcon className="size-4 text-emerald-600" />
                                Excel
                            </button>
                            <button
                                type="button"
                                onClick={handleExportCSV}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
                            >
                                <FileText className="size-4 text-blue-600" />
                                CSV
                            </button>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );

    const body = (
        <>
            {periodControls}
            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                </div>
            ) : (
                <div className="grid gap-6 print-container">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <DetailKpi label="Revenue" value={formatGhs(stats.revenue)} />
                        <DetailKpi label="COGS" value={formatGhs(stats.cogs)} color="red" />
                        <DetailKpi
                            label="Gross profit"
                            value={formatGhs(grossProfit)}
                            highlight
                        />
                        <DetailKpi
                            label="Gross margin"
                            value={`${stats.profitMargin.toFixed(1)}%`}
                        />
                        <DetailKpi
                            label="Operating expenses (paid)"
                            value={formatGhs(operatingExpenses)}
                            color="red"
                        />
                        <DetailKpi
                            label="Net operating profit"
                            value={formatGhs(netOperatingProfit)}
                            highlight
                        />
                    </div>
                    <div className="rounded-xl border border-dashed border-[#eef0f2] bg-muted/20 px-4 py-3 text-[13px] text-muted-foreground dark:border-white/[0.08]">
                        Net margin on revenue:{" "}
                        <strong className="text-foreground">
                            {netOperatingMargin.toFixed(1)}%
                        </strong>
                        . Set <strong>cost price</strong> on each product for accurate COGS.
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="mb-6 font-semibold text-foreground">
                                Gross profit by category
                            </h3>
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
                                    <p className="py-10 text-center text-sm text-muted-foreground">
                                        No category data for this period.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                                <h3 className="mb-4 font-semibold text-foreground">Margins</h3>
                                <p className="text-[13px] leading-relaxed text-muted-foreground">
                                    Gross margin is{" "}
                                    <strong>{stats.profitMargin.toFixed(1)}%</strong> of revenue.
                                    After paid expenses, net margin is{" "}
                                    <strong>{netOperatingMargin.toFixed(1)}%</strong>.
                                </p>
                            </div>
                            {stats.topItem ? (
                                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                                    <h3 className="mb-4 font-semibold text-foreground">
                                        Top margin item (catalog)
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                            <TrendingUp className="size-5" />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-medium text-foreground">
                                                {stats.topItem.name}
                                            </p>
                                            <p className="text-[12px] text-muted-foreground">
                                                {stats.topItem.margin.toFixed(0)}% list margin
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    if (variant === "finance") {
        return (
            <ProductsPageShell
                title="Profit & loss"
                description={description}
                actions={exportActions}
            >
                {body}
            </ProductsPageShell>
        );
    }

    return (
        <SalesDetailLayout title="Profit & loss" description={description} actions={exportActions}>
            {body}
        </SalesDetailLayout>
    );
}

function DetailKpi({
    label,
    value,
    color,
    highlight,
    trend,
}: {
    label: string;
    value: string;
    color?: string;
    highlight?: boolean;
    trend?: string;
}) {
    return (
        <div
            className={`rounded-xl border border-[#eef0f2] p-4 dark:border-white/[0.06] ${highlight ? "border-[#006c49]/30 bg-[#006c49]/05 dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/05" : "bg-white dark:bg-[#111]"}`}
        >
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <div className="mt-2 flex items-baseline justify-between">
                <h4
                    className={`font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight ${color === "red" ? "text-red-600" : highlight ? "text-[#006c49] dark:text-[#6ffbbe]" : "text-foreground"}`}
                >
                    {value}
                </h4>
                {trend ? (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#006c49] dark:text-[#6ffbbe]">
                        <ArrowUpRight className="size-3" strokeWidth={3} />
                        {trend}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function CategoryProfit({
    label,
    revenue,
    cost,
    margin,
}: {
    label: string;
    revenue: string;
    cost: string;
    margin: number;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[14px] font-semibold text-foreground">{label}</p>
                    <p className="text-[12px] text-muted-foreground">
                        Rev: {revenue} | COGS: {cost}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[14px] font-bold text-[#006c49] dark:text-[#6ffbbe]">
                        {margin.toFixed(1)}%
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Gross margin
                    </p>
                </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                    className="h-full bg-gradient-to-r from-[#006c49] to-[#6ffbbe]"
                    style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                />
            </div>
        </div>
    );
}
