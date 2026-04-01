"use client";

import { ProductsPageShell } from "../products/products-page-shell";
import Link from "next/link";
import useSWR from "swr";
import { CashFlowChart, ExpenseBreakdownChart } from "./finance-charts";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Receipt, Loader2 } from "lucide-react";
import { useBranchContext } from "../branch-context";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function FinanceOverviewView() {
    const { branchId } = useBranchContext();
    const { data: overview, isLoading } = useSWR(`/api/finance/overview?b=${branchId}`, fetcher);

    if (isLoading) {
        return (
            <ProductsPageShell title="Finance Overview" description="Track cash flow, revenue trends, and operational expenses across your business.">
                <div className="flex w-full items-center justify-center py-24">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (!overview) return null;

    const totalRev = Number(overview.totalRevenue) || 0;
    const totalExp = Number(overview.totalExpenses) || 0;
    const netProfit = Number(overview.netProfit) || 0;

    return (
        <ProductsPageShell
            title="Finance Overview"
            description="Track cash flow, revenue trends, and operational expenses across your business."
        >
            {/* KPI Cards */}
            <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Revenue */}
                <Link
                    href="/dashboard/sales/revenue"
                    className="group flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 transition-all hover:-translate-y-1 hover:border-[#006c49]/30 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/30"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/08 text-[#006c49] transition-colors group-hover:bg-[#006c49] group-hover:text-white dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] dark:group-hover:bg-[#6ffbbe] dark:group-hover:text-black">
                            <TrendingUp className="size-5" />
                        </div>
                        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                            Total Revenue (30 Days)
                        </p>
                    </div>
                    <div className="mt-4 flex items-end gap-3">
                        <h4 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
                            {formatGhs(totalRev)}
                        </h4>
                    </div>
                </Link>

                {/* Total Expenses */}
                <Link
                    href="/dashboard/finance/expenses"
                    className="group flex flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 transition-all hover:-translate-y-1 hover:border-[#006c49]/20 hover:shadow-lg dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 transition-colors group-hover:bg-red-500 group-hover:text-white dark:bg-red-500/10 dark:text-red-400 dark:group-hover:bg-red-500 dark:group-hover:text-white">
                            <Receipt className="size-5" />
                        </div>
                        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                            Total Expenses (30 Days)
                        </p>
                    </div>
                    <div className="mt-4 flex items-end gap-3">
                        <h4 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foreground">
                            {formatGhs(totalExp)}
                        </h4>
                    </div>
                </Link>

                {/* Net Profit */}
                <div
                    className="group flex flex-col rounded-[1.25rem] border border-[#006c49]/30 bg-[#006c49]/04 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/05 lg:col-span-1 sm:col-span-2 cursor-default"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-[#006c49]/08 text-[#006c49] transition-colors group-hover:bg-[#006c49] group-hover:text-white dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] dark:group-hover:bg-[#6ffbbe] dark:group-hover:text-black">
                            <Wallet className="size-5" />
                        </div>
                        <p className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground group-hover:text-foreground">
                            Net Profit (30 Days)
                        </p>
                    </div>
                    <div className="mt-4 flex items-end gap-3">
                        <h4 className={`font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight ${netProfit >= 0 ? "text-[#006c49] dark:text-[#6ffbbe]" : "text-red-600 dark:text-red-400"}`}>
                            {formatGhs(netProfit)}
                        </h4>
                    </div>
                </div>
            </div>

            {/* Charts section */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 h-[410px]">
                    <CashFlowChart data={overview.trends || []} />
                </div>
                <div className="lg:col-span-1 h-[410px]">
                    <ExpenseBreakdownChart data={overview.expenseBreakdown || []} total={totalExp} />
                </div>
            </div>
        </ProductsPageShell>
    );
}
