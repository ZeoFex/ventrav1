"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { Loader2, ArrowLeft, Calendar } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { toast } from "sonner";
import { useSession } from "@/app/components/auth/use-session";
import { EXPENSE_CATEGORY_OPTIONS } from "@/app/lib/expense-categories";

const fetcher = (url: string) => fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load");
    return r.json();
});

const PAYMENT_OPTIONS = [
    { value: "cash", label: "Cash" },
    { value: "mtn_momo", label: "MTN Mobile Money" },
    { value: "vodafone_cash", label: "Vodafone Cash" },
    { value: "atmoney", label: "AT Money" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
];

export function ExpenseSchedulesView() {
    const { user } = useSession();
    const canManage =
        user?.role === "owner" ||
        user?.role === "manager" ||
        (user?.permissions?.includes("finance-expense-schedules") ?? false);

    const { data, isLoading, mutate } = useSWR(
        canManage ? "/api/finance/expense-schedules" : null,
        fetcher,
    );

    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [vendor, setVendor] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [amount, setAmount] = useState("");
    const [statusDefault, setStatusDefault] = useState<"Paid" | "Pending">("Paid");
    const [dayOfMonth, setDayOfMonth] = useState("1");
    const [firstRunAt, setFirstRunAt] = useState(() =>
        new Date().toISOString().split("T")[0]!,
    );
    const [saving, setSaving] = useState(false);

    const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!canManage) return;
        const amt = Number(amount);
        const dom = Math.min(28, Math.max(1, parseInt(dayOfMonth, 10) || 1));
        if (!category || !description.trim() || !Number.isFinite(amt) || amt <= 0) {
            toast.error("Fill category, description, and a valid amount.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/finance/expense-schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    description: description.trim(),
                    vendor: vendor.trim() || null,
                    paymentMethod,
                    amountGhs: amt,
                    statusDefault,
                    dayOfMonth: dom,
                    firstRunAt: new Date(firstRunAt).toISOString(),
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Save failed");
            toast.success("Recurring expense scheduled");
            setDescription("");
            setAmount("");
            setVendor("");
            await mutate();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Could not save");
        } finally {
            setSaving(false);
        }
    }

    if (!canManage) {
        return (
            <ProductsPageShell
                title="Recurring expenses"
                description="Managers and owners can automate recurring bills such as salaries."
                actions={
                    <Link
                        href="/dashboard/finance/expenses"
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px] font-medium"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                }
            >
                <p className="text-muted-foreground">
                    You don&apos;t have permission to manage recurring expenses.
                </p>
            </ProductsPageShell>
        );
    }

    return (
        <ProductsPageShell
            title="Recurring expenses"
            description="Create monthly schedules (e.g. salaries). Due rows are posted by the daily cron job."
            actions={
                <Link
                    href="/dashboard/finance/expenses"
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px] font-medium"
                >
                    <ArrowLeft className="size-4" />
                    Expense list
                </Link>
            }
        >
            <div className="grid gap-8 lg:grid-cols-2">
                <form
                    onSubmit={handleCreate}
                    className="space-y-4 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]"
                >
                    <h2 className="text-[15px] font-semibold">New monthly schedule</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-[13px] font-medium">Description</label>
                            <input
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">Category</label>
                            <select
                                required
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            >
                                <option value="">Select…</option>
                                {EXPENSE_CATEGORY_OPTIONS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">Amount (GHS)</label>
                            <input
                                required
                                type="number"
                                min={0}
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">Vendor / payee</label>
                            <input
                                value={vendor}
                                onChange={(e) => setVendor(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">Payment method</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            >
                                {PAYMENT_OPTIONS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">Default status</label>
                            <select
                                value={statusDefault}
                                onChange={(e) =>
                                    setStatusDefault(e.target.value as "Paid" | "Pending")
                                }
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            >
                                <option value="Paid">Paid</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">Day of month (1–28)</label>
                            <input
                                type="number"
                                min={1}
                                max={28}
                                value={dayOfMonth}
                                onChange={(e) => setDayOfMonth(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[13px] font-medium">First run date</label>
                            <input
                                type="date"
                                value={firstRunAt}
                                onChange={(e) => setFirstRunAt(e.target.value)}
                                className="w-full rounded-xl border px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#141414]"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-[#006c49] px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003523]"
                    >
                        {saving ? <Loader2 className="size-4 animate-spin" /> : "Save schedule"}
                    </button>
                </form>

                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <h2 className="mb-4 text-[15px] font-semibold">Active schedules</h2>
                    {isLoading ? (
                        <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    ) : rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No schedules yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {rows.map((row: any) => (
                                <li
                                    key={row.id}
                                    className="rounded-xl border border-[#eef0f2] p-4 text-[13px] dark:border-white/[0.08]"
                                >
                                    <p className="font-semibold text-foreground">{row.description}</p>
                                    <p className="text-muted-foreground">{row.category} · GHS {row.amountGhs}</p>
                                    <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                                        <Calendar className="size-3.5" />
                                        Next: {new Date(row.nextRunAt).toLocaleDateString("en-GB")}
                                        {row.active ? "" : " (inactive)"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </ProductsPageShell>
    );
}
