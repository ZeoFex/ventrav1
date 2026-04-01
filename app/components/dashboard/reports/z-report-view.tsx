"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Share2, Clock, User, Wallet, History } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { MOCK_Z_REPORT } from "./reports-mock-data";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
    }).format(n);
}

export function ZReportView() {
    return (
        <ProductsPageShell
            title="End of Day (Z-Report)"
            description="Daily summary of sales, shift activities, and cash drawer reconciliation."
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
                    <button className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-105">
                        <Share2 className="size-4" />
                        Finalize & Close Shift
                    </button>
                </div>
            }
        >
            <div className="grid gap-6">
                {/* SHIFT INFO */}
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="flex flex-wrap items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/05 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                <History className="size-5" />
                            </div>
                            <div>
                                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Shift ID</p>
                                <p className="font-semibold text-foreground">{MOCK_Z_REPORT.shiftId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/05 text-blue-600">
                                <User className="size-5" />
                            </div>
                            <div>
                                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Opened By</p>
                                <p className="font-semibold text-foreground">{MOCK_Z_REPORT.openedBy}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/05 text-amber-600">
                                <Clock className="size-5" />
                            </div>
                            <div>
                                <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Period</p>
                                <p className="font-semibold text-foreground">08:00 AM - 05:30 PM</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RECONCILIATION */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                            <h3 className="mb-6 font-semibold text-foreground">Cash Drawer Reconciliation</h3>
                            <div className="space-y-4">
                                <ReconciliationRow label="Opening Balance" value={MOCK_Z_REPORT.openingBalance} />
                                <ReconciliationRow label="Net Sales Cash" value={2850} />
                                <ReconciliationRow label="Cash-In (Manual)" value={900} />
                                <ReconciliationRow label="Cash-Out (Misc)" value={-0} />
                                <div className="border-t border-[#f0f2f4] pt-4 dark:border-white/[0.04]">
                                    <ReconciliationRow label="Expected Drawer Value" value={MOCK_Z_REPORT.expectedCash} isTotal />
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[14px] font-medium text-muted-foreground">Actual Cash Counted</span>
                                        <div className="flex flex-col items-end">
                                            <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[#006c49] dark:text-[#6ffbbe]">{formatGhs(MOCK_Z_REPORT.actualCash)}</span>
                                            <span className={`text-[12px] font-bold ${MOCK_Z_REPORT.discrepancy < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {MOCK_Z_REPORT.discrepancy < 0 ? `Shortage: ${MOCK_Z_REPORT.discrepancy}` : `Overage: ${MOCK_Z_REPORT.discrepancy}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-6 font-semibold text-foreground">Payments Summary</h3>
                        <div className="space-y-6">
                            {MOCK_Z_REPORT.salesByMethod.map((item) => (
                                <div key={item.method} className="space-y-2">
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="font-medium text-muted-foreground">{item.method}</span>
                                        <span className="font-semibold text-foreground">{formatGhs(item.amount)}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-muted/30">
                                        <div
                                            className="h-full rounded-full bg-[#006c49] dark:bg-[#6ffbbe]"
                                            style={{ width: `${(item.amount / MOCK_Z_REPORT.closingBalance) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </ProductsPageShell>
    );
}

function ReconciliationRow({ label, value, isTotal }: { label: string; value: number; isTotal?: boolean }) {
    return (
        <div className={`flex items-center justify-between py-1 ${isTotal ? 'text-foreground' : 'text-muted-foreground'}`}>
            <span className={`text-[14px] ${isTotal ? 'font-bold' : 'font-medium'}`}>{label}</span>
            <span className={`font-[family-name:var(--font-display)] text-[15px] ${isTotal ? 'font-bold' : 'font-semibold'}`}>
                {value < 0 ? `- ${formatGhs(Math.abs(value))}` : formatGhs(value)}
            </span>
        </div>
    )
}
