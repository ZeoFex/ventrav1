"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";

const fetcher = (u: string) =>
    fetch(u).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

type ExpenseRow = {
    id: string;
    date: string;
    category: string;
    amount: number;
    description: string;
    status: string;
    vendor?: string | null;
};

function startOfWeek(d: Date): Date {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function ExpenseReportsView() {
    const { branchId } = useBranchContext();
    const [from, setFrom] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 2);
        return d.toISOString().slice(0, 10);
    });
    const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

    const url = useMemo(() => {
        const q = new URLSearchParams();
        q.set("b", branchId);
        if (from) q.set("from", from);
        if (to) q.set("to", to);
        return `/api/finance/expenses?${q.toString()}`;
    }, [branchId, from, to]);

    const { data, isLoading } = useSWR(url, fetcher);
    const rows = (data ?? []) as ExpenseRow[];

    const paidRows = useMemo(() => rows.filter((r) => r.status === "Paid"), [rows]);

    const totals = useMemo(() => {
        let total = 0;
        const byCat = new Map<string, number>();
        const byDay = new Map<string, number>();
        const byWeek = new Map<string, number>();
        const byMonth = new Map<string, number>();

        for (const r of paidRows) {
            total += r.amount;
            byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
            const day = new Date(r.date);
            const ds = day.toISOString().slice(0, 10);
            byDay.set(ds, (byDay.get(ds) ?? 0) + r.amount);
            const ws = startOfWeek(day).toISOString().slice(0, 10);
            byWeek.set(ws, (byWeek.get(ws) ?? 0) + r.amount);
            const ms = startOfMonth(day).toLocaleDateString("en-CA", { year: "numeric", month: "long" });
            byMonth.set(ms, (byMonth.get(ms) ?? 0) + r.amount);
        }

        return {
            total,
            byCat: [...byCat.entries()].sort((a, b) => b[1] - a[1]),
            daily: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-14),
            weekly: [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8),
            monthly: [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])),
        };
    }, [paidRows]);

    return (
        <ProductsPageShell
            title="Expense reports"
            description="Summaries for the selected period (paid expenses only). Profit impact needs sales reports—use this to see cost pressure from spend."
            actions={
                <Link
                    href="/dashboard/finance/expenses"
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px]"
                >
                    <ArrowLeft className="size-4" />
                    Expense history 
                </Link>
            }
        >
            <div className="mb-6 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-[13px]">
                    From
                    <input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                    />
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                    To
                    <input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                    />
                </label>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]">
                        <h2 className="text-[15px] font-semibold">Totals</h2>
                        <p className="mt-3 text-2xl font-bold tabular-nums">
                            ₵{totals.total.toFixed(2)} <span className="text-[14px] font-normal text-muted-foreground">paid</span>
                        </p>
                    </section>

                    <section className="rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]">
                        <h2 className="text-[15px] font-semibold">Category breakdown</h2>
                        {!totals.byCat.length ? (
                            <p className="mt-2 text-[13px] text-muted-foreground">No data in range.</p>
                        ) : (
                            <ul className="mt-3 space-y-2 text-[14px]">
                                {totals.byCat.map(([cat, amt]) => (
                                    <li key={cat} className="flex justify-between gap-4">
                                        <span>{cat}</span>
                                        <span className="tabular-nums font-medium">
                                            ₵{amt.toFixed(2)}
                                            <span className="ml-2 text-muted-foreground">
                                                ({totals.total > 0 ? ((amt / totals.total) * 100).toFixed(1) : 0}%)
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section className="rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08] lg:col-span-2">
                        <h2 className="text-[15px] font-semibold">Recent days (last 14 data points)</h2>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-left text-[13px]">
                                <thead className="border-b text-muted-foreground">
                                    <tr>
                                        <th className="py-2">Date</th>
                                        <th className="py-2 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {totals.daily.map(([d, a]) => (
                                        <tr key={d} className="border-b border-dashed">
                                            <td className="py-1.5">{d}</td>
                                            <td className="py-1.5 text-right tabular-nums">₵{a.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]">
                        <h2 className="text-[15px] font-semibold">Weekly summary</h2>
                        <ul className="mt-3 space-y-1 text-[13px]">
                            {totals.weekly.map(([w, a]) => (
                                <li key={w} className="flex justify-between">
                                    <span className="text-muted-foreground">Week of {w}</span>
                                    <span className="font-medium tabular-nums">₵{a.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]">
                        <h2 className="text-[15px] font-semibold">Monthly summary</h2>
                        <ul className="mt-3 space-y-1 text-[13px]">
                            {totals.monthly.map(([m, a]) => (
                                <li key={m} className="flex justify-between">
                                    <span>{m}</span>
                                    <span className="font-medium tabular-nums">₵{a.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20 lg:col-span-2">
                        <h2 className="text-[15px] font-semibold">Profit impact</h2>
                        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
                            For revenue, COGS (from product cost prices), and paid expenses in one place, open{" "}
                            <Link href="/dashboard/finance/pnl" className="font-medium text-[#006c49] underline dark:text-[#6ffbbe]">
                                Profit &amp; loss
                            </Link>
                            .{" "}
                            <Link href="/dashboard/reports/sales-summary" className="font-medium text-[#006c49] underline dark:text-[#6ffbbe]">
                                Sales summary
                            </Link>{" "}
                            adds sell-through context for the same period.
                        </p>
                    </section>
                </div>
            )}
        </ProductsPageShell>
    );
}
