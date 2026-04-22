"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { Plus, Search, Filter, ReceiptText, Loader2, Check, X, Calendar, Trash2 } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";
import { toast } from "sonner";
import { getCachedExpenses, cacheExpenses } from "@/app/lib/offline/offline-db";
import { useOnlineStatus } from "@/app/lib/offline/use-online-status";

const EXPENSE_CATEGORIES = [
    "Payroll",
    "Inventory",
    "Utilities",
    "Marketing",
    "Logistics",
    "Maintenance",
    "Misc",
];

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

function formatDate(d: string): string {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(d));
}

const fetcher = async (url: string) => {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch expenses");
        const data = await res.json();
        // Cache the fresh data
        await cacheExpenses(data).catch(console.error);
        return data;
    } catch (err) {
        // Fallback to cache
        const cached = await getCachedExpenses();
        if (cached && cached.length > 0) {
            console.warn("[Offline-First] Falling back to cached expenses.");
            return cached;
        }
        throw err;
    }
};

export function ExpensesView() {
    const { branchId } = useBranchContext();
    const { data: expenses, isLoading, mutate } = useSWR(`/api/finance/expenses?b=${branchId}`, fetcher);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const filteredExpenses = useMemo(() => {
        if (!expenses) return [];
        return expenses.filter((exp: any) => {
            const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 exp.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "all" || exp.status === statusFilter;
            const matchesCategory = categoryFilter === "all" || exp.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [expenses, searchQuery, statusFilter, categoryFilter]);

    async function toggleStatus(expense: any) {
        if (updatingId) return;
        const newStatus = expense.status === "Paid" ? "Pending" : "Paid";
        
        setUpdatingId(expense.id);
        try {
            const res = await fetch(`/api/finance/expenses/${expense.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error("Failed to update status");

            await mutate();
            toast.success(`Expense marked as ${newStatus}`, {
                description: expense.description
            });
        } catch (error) {
            toast.error("Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    }

    async function removeExpense(expense: { id: string; description: string }) {
        if (deletingId) return;
        const ok = window.confirm(
            `Delete this expense?\n\n${expense.description}\n\nThis cannot be undone.`,
        );
        if (!ok) return;

        setDeletingId(expense.id);
        try {
            const res = await fetch(`/api/finance/expenses/${expense.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete");
            await mutate();
            toast.success("Expense deleted");
        } catch {
            toast.error("Could not delete expense");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <ProductsPageShell
            title="Expenses"
            description="Track and manage all operational costs, payroll, and inventory purchases."
            actions={
                <Link
                    href="/dashboard/finance/expenses/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.35)] hover:brightness-110"
                >
                    <Plus className="size-4" strokeWidth={2.5} />
                    Record Expense
                </Link>
            }
        >
        <div className="flex flex-col gap-6">
            {/* Controls */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground opacity-50" />
                    <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-2xl border border-[#e5e7eb] bg-white py-2.5 pl-10 pr-4 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/05 transition-all dark:border-white/[0.12] dark:bg-[#141414]"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all ${
                                isFilterOpen || statusFilter !== "all" || categoryFilter !== "all"
                                ? "border-[#006c49]/30 bg-[#006c49]/05 text-[#006c49] dark:border-[#6ffbbe]/30 dark:bg-[#6ffbbe]/05 dark:text-[#6ffbbe]"
                                : "border-[#e5e7eb] bg-white text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                            }`}
                        >
                            <Filter className="size-4" />
                            Filters
                            {(statusFilter !== "all" || categoryFilter !== "all") && (
                                <span className="flex size-4 items-center justify-center rounded-full bg-[#006c49] text-[10px] text-white dark:bg-[#6ffbbe] dark:text-black">
                                    {(statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0)}
                                </span>
                            )}
                        </button>

                        {isFilterOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-4 shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status</p>
                                            <div className="flex flex-wrap gap-2">
                                                {["all", "Paid", "Pending"].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setStatusFilter(s)}
                                                        className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                                                            statusFilter === s
                                                            ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-black"
                                                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                        }`}
                                                    >
                                                        {s === "all" ? "All" : s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Category</p>
                                            <select 
                                                value={categoryFilter}
                                                onChange={(e) => setCategoryFilter(e.target.value)}
                                                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-[13px] outline-none focus:border-[#006c49]/40"
                                            >
                                                <option value="all">All Categories</option>
                                                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <button 
                                            onClick={() => { setStatusFilter("all"); setCategoryFilter("all"); setIsFilterOpen(false); }}
                                            className="w-full pt-2 text-[12px] font-semibold text-red-500 hover:underline text-left"
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="relative min-h-[400px]">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10 rounded-2xl">
                        <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                    </div>
                ) : null}

                {filteredExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-[#eef0f2] bg-white px-6 py-24 text-center dark:border-white/10 dark:bg-[#111]">
                        <div className="flex size-16 items-center justify-center rounded-3xl bg-muted/50 text-muted-foreground mb-4">
                            <ReceiptText className="size-8 opacity-20" />
                        </div>
                        <h3 className="text-[16px] font-bold text-foreground">No expenses found</h3>
                        <p className="mt-1 text-[14px] text-muted-foreground max-w-[240px]">
                            Try adjusting your filters or record a new expense.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View: Cards */}
                        <div className="grid gap-4 sm:hidden pb-10">
                            {filteredExpenses.map((exp: any) => (
                                <div key={exp.id} className="rounded-2xl border border-border bg-white p-5 dark:bg-[#111] dark:border-white/10 shadow-sm transition-all hover:border-[#006c49]/20">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f5f7] dark:bg-white/5 text-muted-foreground border dark:border-white/5">
                                                <ReceiptText className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-[15px] truncate text-foreground">{exp.description}</h4>
                                                <p className="text-[12px] text-muted-foreground mt-0.5">{exp.category}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleStatus(exp)}
                                            disabled={updatingId === exp.id}
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${exp.status === "Paid"
                                                ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] hover:bg-[#006c49]/20"
                                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                                                }`}
                                        >
                                            {updatingId === exp.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                                            {exp.status}
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-end justify-between gap-3 pt-4 border-t dark:border-white/5">
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground opacity-60">Date</p>
                                            <p className="text-[13px] font-medium text-foreground">{formatDate(exp.date)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground opacity-60">Amount</p>
                                            <p className="text-[18px] font-bold text-foreground font-[family-name:var(--font-display)]">{formatGhs(exp.amount)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-end border-t border-dashed pt-3 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => removeExpense(exp)}
                                            disabled={deletingId === exp.id}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                                        >
                                            {deletingId === exp.id ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="size-3.5" />
                                            )}
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden sm:block overflow-hidden rounded-2xl border border-[#eef0f2] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
                            <table className="w-full whitespace-nowrap text-left text-[14px]">
                                <thead className="border-b border-[#f0f2f4] bg-[#fafafa]/50 text-[11px] font-bold uppercase tracking-widest text-muted-foreground dark:border-white/[0.04] dark:bg-white/[0.02]">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                    {filteredExpenses.map((exp: any) => (
                                        <tr
                                            key={exp.id}
                                            className="group transition-colors hover:bg-muted/30 dark:hover:bg-white/[0.02]"
                                        >
                                            <td className="px-6 py-4 font-medium text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="size-3.5 opacity-40" />
                                                    {formatDate(exp.date)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-8 items-center justify-center rounded-lg bg-[#f4f5f7] text-muted-foreground dark:bg-[#1a1a1a]">
                                                        <ReceiptText className="size-4 opacity-50" />
                                                    </div>
                                                    <span className="font-semibold text-foreground">{exp.description}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center rounded-lg bg-muted/50 px-2 py-1 text-[12px] font-medium text-muted-foreground border dark:border-white/5">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-[family-name:var(--font-display)] font-bold text-right text-[15px] text-foreground">
                                                {formatGhs(exp.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => toggleStatus(exp)}
                                                    disabled={updatingId === exp.id}
                                                    title={`Click to mark as ${exp.status === "Paid" ? "Pending" : "Paid"}`}
                                                    className={`group/badge relative inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all hover:ring-2 hover:ring-current/20 active:scale-95 disabled:opacity-50 ${exp.status === "Paid"
                                                        ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                        }`}
                                                >
                                                    {updatingId === exp.id ? (
                                                        <Loader2 className="size-3 animate-spin" />
                                                    ) : (
                                                        exp.status === "Paid" ? <Check className="size-3" /> : <X className="size-3" />
                                                    )}
                                                    {exp.status}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => removeExpense(exp)}
                                                    disabled={deletingId === exp.id}
                                                    title="Delete expense"
                                                    className="inline-flex size-9 items-center justify-center rounded-xl border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/40"
                                                >
                                                    {deletingId === exp.id ? (
                                                        <Loader2 className="size-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="size-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
        </ProductsPageShell>
    );
}
