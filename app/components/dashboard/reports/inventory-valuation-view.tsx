"use client";

import Link from "next/link";
import useSWR from "swr";
import {
    ArrowLeft,
    Printer,
    Download,
    Package,
    AlertTriangle,
    TrendingUp,
    DollarSign,
    Loader2,
} from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";
import { InventoryValueChart, MarginGaugeChart, CategoryMixPieChart } from "./reports-charts";
import { ReportsInsightsPanel } from "./reports-insights-panel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function InventoryValuationView() {
    const { branchId } = useBranchContext();
    const { data, isLoading } = useSWR(`/api/reports/inventory-valuation?b=${branchId}`, fetcher);

    if (isLoading) {
        return (
            <ProductsPageShell title="Inventory Valuation" description="Loading stock analytics…" actions={<div />}>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (!data?.summary) return null;

    const { summary, lowStockItems, categoryBreakdown, insights = [] } = data;

    return (
        <ProductsPageShell
            title="Inventory Valuation"
            description="Analysis of current stock worth, potential profit, and inventory health."
            actions={
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/reports"
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <Printer className="size-4" />
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg"
                    >
                        <Download className="size-4" />
                        Export
                    </button>
                </div>
            }
        >
            <div className="grid gap-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <ValuationKpi label="Active products" value={summary.totalProducts.toLocaleString()} icon={Package} />
                    <ValuationKpi label="Units in stock" value={summary.totalUnits.toLocaleString()} icon={Package} />
                    <ValuationKpi label="Cost value" value={formatGhs(summary.costValue)} icon={DollarSign} />
                    <ValuationKpi label="Retail value" value={formatGhs(summary.retailValue)} icon={TrendingUp} highlight />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <ValuationKpi label="Potential profit" value={formatGhs(summary.potentialProfit)} highlight />
                    <ValuationKpi label="Low stock items" value={String(summary.lowStockCount)} warning={summary.lowStockCount > 0} />
                    <ValuationKpi label="Out of stock" value={String(summary.outOfStockCount)} warning={summary.outOfStockCount > 0} />
                </div>

                <ReportsInsightsPanel insights={insights} title="Inventory insights" />

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <InventoryValueChart data={categoryBreakdown} />
                    </div>
                    <MarginGaugeChart percent={summary.marginPercent} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <CategoryMixPieChart
                        data={categoryBreakdown.map((c: { category: string; retailValue: number }) => ({
                            category: c.category,
                            retailValue: c.retailValue,
                        }))}
                        valueKey="retailValue"
                    />

                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Critical stock alerts</h3>
                            {summary.lowStockCount > 0 ? (
                                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600">
                                    {summary.lowStockCount} items
                                </span>
                            ) : null}
                        </div>
                        <div className="space-y-4">
                            {lowStockItems.length > 0 ? (
                                lowStockItems.map((item: {
                                    id: string;
                                    name: string;
                                    stock: number;
                                    reorder: number;
                                    category: string;
                                }) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between border-b border-[#f0f2f4] pb-4 last:border-0 last:pb-0 dark:border-white/[0.04]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/05 text-red-600">
                                                <AlertTriangle className="size-5" />
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-semibold text-foreground">{item.name}</p>
                                                <p className="text-[12px] text-muted-foreground">
                                                    {item.category} · Stock {item.stock} / reorder {item.reorder}
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            href="/dashboard/suppliers"
                                            className="rounded-lg bg-[#006c49]/05 px-3 py-1.5 text-[12px] font-bold text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                                        >
                                            Restock
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <p className="py-8 text-center text-[13px] text-muted-foreground">
                                    All products are above reorder levels.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}

function ValuationKpi({
    label,
    value,
    icon: Icon,
    highlight,
    warning,
}: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    warning?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border p-4 ${
                highlight
                    ? "border-[#006c49]/30 bg-[#006c49]/05 dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/05"
                    : warning
                      ? "border-amber-500/30 bg-amber-500/05"
                      : "border-[#eef0f2] bg-white dark:border-white/[0.06] dark:bg-[#111]"
            }`}
        >
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
            </div>
            <h4
                className={`mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight ${
                    highlight ? "text-[#006c49] dark:text-[#6ffbbe]" : warning ? "text-amber-600" : "text-foreground"
                }`}
            >
                {value}
            </h4>
        </div>
    );
}
