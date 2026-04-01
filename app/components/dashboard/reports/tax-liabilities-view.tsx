"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Calculator, Scale, FileText, CheckCircle2 } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { MOCK_TAXES } from "./reports-mock-data";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
    }).format(n);
}

export function TaxLiabilitiesView() {
    return (
        <ProductsPageShell
            title="Tax Liabilities"
            description="Breakdown of taxes collected for the Ghana Revenue Authority (GRA)."
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
                    <button className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg">
                        <FileText className="size-4" />
                        Generate GRA Return
                    </button>
                </div>
            }
        >
            <div className="grid gap-6">
                {/* TAX PERIOD SUMMARY */}
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                <Calculator className="size-6" />
                            </div>
                            <div>
                                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Filing Period</p>
                                <h3 className="text-xl font-bold text-foreground">{MOCK_TAXES.period}</h3>
                            </div>
                        </div>
                        <div className="h-12 w-px bg-[#f0f2f4] hidden md:block dark:bg-white/[0.04]" />
                        <div className="flex flex-col">
                            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Total Taxable Sales</p>
                            <h4 className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">{formatGhs(MOCK_TAXES.totalTaxableSales)}</h4>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-[13px] font-bold uppercase tracking-wider text-[#006c49] dark:text-[#6ffbbe]">Total Tax Liability</p>
                            <h4 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#006c49] dark:text-[#6ffbbe]">{formatGhs(MOCK_TAXES.totalTax)}</h4>
                        </div>
                    </div>
                </div>

                {/* TAX BREAKDOWN TABLE */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-6 font-semibold text-foreground">Levy breakdown</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px]">
                                <thead className="border-b border-[#f0f2f4] text-[12px] uppercase tracking-wide text-muted-foreground dark:border-white/[0.04]">
                                    <tr>
                                        <th className="pb-3 font-semibold">Tax/Levy Name</th>
                                        <th className="pb-3 font-semibold text-right">Collected Amount</th>
                                        <th className="pb-3 font-semibold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                    {MOCK_TAXES.taxBreakdown.map((tax) => (
                                        <tr key={tax.name}>
                                            <td className="py-4 font-medium text-foreground">{tax.name}</td>
                                            <td className="py-4 text-right font-[family-name:var(--font-display)] font-semibold text-foreground">{formatGhs(tax.amount)}</td>
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
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="mb-4 font-semibold text-foreground">Compliance Scale</h3>
                            <div className="flex items-center gap-3">
                                <Scale className="size-5 text-[#006c49] dark:text-[#6ffbbe]" />
                                <p className="text-[13px] text-muted-foreground">All taxes are calculated based on Ghana Revenue Authority 2024 tax schedules including new levy adjustments.</p>
                            </div>
                        </div>
                        <div className="rounded-2xl border bg-[#006c49] p-6 text-white shadow-lg shadow-[#006c49]/20">
                            <h3 className="mb-2 font-semibold">File tax return</h3>
                            <p className="mb-6 text-[13px] text-white/80">Connect your account directly to itaxghana or download the standard GRA template for offline filing.</p>
                            <button className="w-full rounded-xl bg-white py-3 text-[14px] font-bold text-[#006c49] transition-transform active:scale-95">
                                Download Template (.xlsx)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}
