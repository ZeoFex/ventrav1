"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import {
    ArrowLeft,
    Printer,
    Calculator,
    Scale,
    FileText,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";
import { TaxBreakdownChart, TaxCollectionChart } from "./reports-charts";
import { ReportsInsightsPanel, TrendBadge } from "./reports-insights-panel";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PERIOD_OPTIONS = [
    { days: 30, label: "30 days" },
    { days: 90, label: "90 days" },
    { days: 365, label: "Year" },
];

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function TaxLiabilitiesView() {
    const { branchId } = useBranchContext();
    const [periodDays, setPeriodDays] = useState(30);
    const { data, isLoading } = useSWR(
        `/api/reports/tax-liabilities?period=${periodDays}&b=${branchId}`,
        fetcher,
    );

    if (isLoading) {
        return (
            <ProductsPageShell title="Tax Liabilities" description="Loading tax analytics…" actions={<div />}>
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (!data?.summary) return null;

    const { period, summary, taxBreakdown, dailyTrend, insights = [] } = data;

    return (
        <ProductsPageShell
            title="Tax Liabilities"
            description="Breakdown of taxes collected for the Ghana Revenue Authority (GRA)."
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
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg"
                    >
                        <FileText className="size-4" />
                        GRA export
                    </button>
                </div>
            }
        >
            <div className="grid gap-6">
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                <Calculator className="size-6" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Filing period
                                </p>
                                <h3 className="text-xl font-bold text-foreground">{period?.label}</h3>
                            </div>
                        </div>
                        <div className="h-12 w-px bg-[#f0f2f4] hidden md:block dark:bg-white/[0.04]" />
                        <div className="flex flex-col">
                            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
                                Taxable sales
                            </p>
                            <h4 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">
                                {formatGhs(summary.totalTaxableSales)}
                            </h4>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-2">
                                <p className="text-[13px] font-bold uppercase tracking-wider text-[#006c49] dark:text-[#6ffbbe]">
                                    Total liability
                                </p>
                                <TrendBadge value={summary.taxTrend} suffix="vs prior period" />
                            </div>
                            <h4 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#006c49] dark:text-[#6ffbbe]">
                                {formatGhs(summary.totalTax)}
                            </h4>
                        </div>
                    </div>
                </div>

                <ReportsInsightsPanel insights={insights} title="Tax insights" />

                <div className="grid gap-6 lg:grid-cols-2">
                    <TaxCollectionChart data={dailyTrend} />
                    <TaxBreakdownChart data={taxBreakdown} />
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-6 font-semibold text-foreground">Levy breakdown</h3>
                        <p className="mb-4 text-[12px] text-muted-foreground">
                            Amounts below are estimated splits of collected tax for GRA filing reference.
                        </p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px]">
                                <thead className="border-b border-[#f0f2f4] text-[12px] uppercase tracking-wide text-muted-foreground dark:border-white/[0.04]">
                                    <tr>
                                        <th className="pb-3 font-semibold">Tax / levy</th>
                                        <th className="pb-3 text-right font-semibold">Amount</th>
                                        <th className="pb-3 text-center font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                    {taxBreakdown.map((tax: { name: string; amount: number }) => (
                                        <tr key={tax.name}>
                                            <td className="py-4 font-medium text-foreground">{tax.name}</td>
                                            <td className="py-4 text-right font-[family-name:var(--font-display)] font-semibold">
                                                {formatGhs(tax.amount)}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center justify-center">
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                                                        <CheckCircle2 className="size-3" />
                                                        Ready
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-[#f0f2f4] dark:border-white/[0.04]">
                                        <td className="py-4 font-bold text-foreground">Total collected</td>
                                        <td className="py-4 text-right font-[family-name:var(--font-display)] text-lg font-bold text-[#006c49] dark:text-[#6ffbbe]">
                                            {formatGhs(summary.totalTax)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="mb-4 font-semibold text-foreground">Compliance</h3>
                            <div className="flex items-start gap-3">
                                <Scale className="mt-0.5 size-5 shrink-0 text-[#006c49] dark:text-[#6ffbbe]" />
                                <p className="text-[13px] leading-relaxed text-muted-foreground">
                                    Tax figures are sourced from completed sales. Levy splits follow Ghana composite
                                    rate estimates — verify with your accountant before filing.
                                </p>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                                <div className="rounded-xl bg-muted/40 p-3 dark:bg-white/[0.04]">
                                    <p className="text-muted-foreground">Transactions</p>
                                    <p className="font-semibold text-foreground">{summary.transactions}</p>
                                </div>
                                <div className="rounded-xl bg-muted/40 p-3 dark:bg-white/[0.04]">
                                    <p className="text-muted-foreground">Net sales</p>
                                    <p className="font-semibold text-foreground">{formatGhs(summary.netSales)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-[#006c49] p-6 text-white shadow-lg shadow-[#006c49]/20">
                            <h3 className="mb-2 font-semibold">File tax return</h3>
                            <p className="mb-6 text-[13px] text-white/80">
                                Download the standard GRA template or connect to iTax Ghana for electronic filing.
                            </p>
                            <button
                                type="button"
                                className="w-full rounded-xl bg-white py-3 text-[14px] font-bold text-[#006c49] transition-transform active:scale-95"
                            >
                                Download template (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}
