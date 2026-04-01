"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Download, Package, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { MOCK_INVENTORY_VALUATION } from "./reports-mock-data";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
    }).format(n);
}

export function InventoryValuationView() {
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
                    <button className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]">
                        <Printer className="size-4" />
                    </button>
                    <button className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg">
                        <Download className="size-4" />
                        Export Valuation
                    </button>
                </div>
            }
        >
            <div className="grid gap-6">
                {/* VALUATION SUMMARY */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <ValuationKpi label="Total Items in Stock" value={MOCK_INVENTORY_VALUATION.totalItems.toString()} icon={Package} />
                    <ValuationKpi label="Total Cost Value" value={formatGhs(MOCK_INVENTORY_VALUATION.costValue)} icon={DollarSign} />
                    <ValuationKpi label="Total Retail Value" value={formatGhs(MOCK_INVENTORY_VALUATION.retailValue)} icon={TrendingUp} />
                    <ValuationKpi label="Potential Profit" value={formatGhs(MOCK_INVENTORY_VALUATION.potentialProfit)} highlight />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* LOW STOCK ALERT */}
                    <div className="lg:col-span-2 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">Critical Stock Alerts</h3>
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-bold text-red-600">Action Required</span>
                        </div>
                        <div className="space-y-4">
                            {MOCK_INVENTORY_VALUATION.lowStockItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between border-b border-[#f0f2f4] pb-4 last:border-0 last:pb-0 dark:border-white/[0.04]">
                                    <div className="flex items-center gap-4">
                                        <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/05 text-red-600">
                                            <AlertTriangle className="size-5" />
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-semibold text-foreground">{item.name}</p>
                                            <p className="text-[12px] text-muted-foreground">Current Stock: {item.stock} | Reorder Level: {item.reorder}</p>
                                        </div>
                                    </div>
                                    <button className="rounded-lg bg-[#006c49]/05 px-3 py-1.5 text-[12px] font-bold text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                        Create PO
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MARGIN INSIGHT */}
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-semibold text-foreground">Profit Margin Analysis</h3>
                        <div className="flex flex-col items-center justify-center py-6">
                            <div className="relative flex h-32 w-32 items-center justify-center">
                                <svg className="h-full w-full rotate-[-90deg]">
                                    <circle cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-[#f4f5f7] dark:text-white/[0.04]" />
                                    <circle
                                        cx="64" cy="64" r="58" fill="transparent" stroke="currentColor" strokeWidth="8"
                                        strokeDasharray={2 * Math.PI * 58}
                                        strokeDashoffset={2 * Math.PI * 58 * (1 - MOCK_INVENTORY_VALUATION.marginPercent / 100)}
                                        className="text-[#006c49] dark:text-[#6ffbbe]"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-[24px] font-bold text-foreground">{MOCK_INVENTORY_VALUATION.marginPercent}%</span>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg Margin</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[13px] text-muted-foreground">
                            Your inventory portfolio currently carries a healthy potential margin. Low-stock pharmacy products represent 62% of pending profit.
                        </p>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}

function ValuationKpi({ label, value, icon: Icon, highlight }: { label: string; value: string; icon?: any; highlight?: boolean }) {
    return (
        <div className={`rounded-xl border border-[#eef0f2] p-4 dark:border-white/[0.06] ${highlight ? 'bg-[#006c49]/05 border-[#006c49]/30 dark:bg-[#6ffbbe]/05 dark:border-[#6ffbbe]/30' : 'bg-white dark:bg-[#111]'}`}>
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                {Icon && <Icon className="size-4 text-muted-foreground" />}
            </div>
            <h4 className={`mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight ${highlight ? 'text-[#006c49] dark:text-[#6ffbbe]' : 'text-foreground'}`}>
                {value}
            </h4>
        </div>
    )
}
