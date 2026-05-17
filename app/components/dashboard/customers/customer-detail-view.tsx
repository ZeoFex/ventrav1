"use client";

import Link from "next/link";
import useSWR from "swr";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ProductsPageShell } from "../products/products-page-shell";
import { GHANA_PAYMENT_METHODS } from "../pos/sale/pos-payment-methods";

const fetcher = (url: string) =>
    fetch(url).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

export function CustomerDetailView({ customerId }: { customerId: string }) {
    const { data, isLoading, error, mutate } = useSWR(
        customerId ? `/api/customers/${customerId}/account` : null,
        fetcher,
    );
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("cash");
    const [payNote, setPayNote] = useState("");
    const [paying, setPaying] = useState(false);

    async function submitPayment(e: React.FormEvent) {
        e.preventDefault();
        const n = Number(payAmount);
        if (!Number.isFinite(n) || n <= 0) {
            toast.error("Enter a valid amount.");
            return;
        }
        setPaying(true);
        try {
            const res = await fetch(`/api/customers/${customerId}/account-payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amountGhs: n,
                    paymentMethod: payMethod,
                    note: payNote.trim() || undefined,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Payment failed");
            toast.success("Payment recorded");
            setPayAmount("");
            setPayNote("");
            await mutate();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Payment failed");
        } finally {
            setPaying(false);
        }
    }

    if (isLoading) {
        return (
            <ProductsPageShell title="Customer" description="">
                <div className="flex min-h-[40vh] items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </ProductsPageShell>
        );
    }

    if (error || !data?.customer) {
        return (
            <ProductsPageShell title="Customer" description="">
                <p className="text-muted-foreground">Could not load this customer.</p>
                <Link href="/dashboard/customers" className="mt-4 inline-block text-[#006c49] underline">
                    Back to customers
                </Link>
            </ProductsPageShell>
        );
    }

    const c = data.customer;
    const ar = Number(c.accountsReceivableGhs ?? 0);
    const entries = (data.entries ?? []) as Array<{
        id: string;
        kind: string;
        amountGhs: string;
        note: string | null;
        createdAt: string;
        saleId: string | null;
    }>;

    return (
        <ProductsPageShell
            title={c.name}
            description="Account balance from credit sales. Record payments when they pay down what they owe."
            actions={
                <Link
                    href={`/dashboard/customers/${customerId}/edit`}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#eef0f2] px-4 py-2.5 text-[14px] font-semibold dark:border-white/10"
                >
                    <Pencil className="size-4" />
                    Edit profile
                </Link>
            }
        >
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Contact
                    </h2>
                    <p className="mt-2 text-[15px]">{c.phone}</p>
                    {c.email ? <p className="mt-1 text-[14px] text-muted-foreground">{c.email}</p> : null}
                    <div className="mt-6 rounded-xl border border-dashed border-[#006c49]/30 bg-[#006c49]/[0.04] p-4 dark:border-[#6ffbbe]/25">
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Amount owed (accounts receivable)
                        </p>
                        <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-foreground">
                            {formatGhs(ar)}
                        </p>
                        <p className="mt-2 text-[12px] text-muted-foreground leading-relaxed">
                            This updates when you use <strong>Pay deposit (owe rest)</strong> on the POS with this customer,
                            or when you post a payment below.
                        </p>
                    </div>
                </div>

                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <h2 className="text-[16px] font-semibold">Record payment on account</h2>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        Use when the customer pays toward their balance (not tied to a new sale).
                    </p>
                    <form onSubmit={submitPayment} className="mt-4 space-y-4">
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground">Amount (GHS)</label>
                            <input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[15px] dark:border-white/12"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground">Method</label>
                            <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[15px] dark:border-white/12 dark:bg-[#141414]"
                            >
                                {GHANA_PAYMENT_METHODS.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-muted-foreground">Note (optional)</label>
                            <input
                                value={payNote}
                                onChange={(e) => setPayNote(e.target.value)}
                                className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[15px] dark:border-white/12"
                                placeholder="e.g. Ref #12345"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={paying || ar < 0.02}
                            className="w-full rounded-xl bg-[#006c49] py-3 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003527]"
                        >
                            {paying ? "Saving…" : "Apply payment"}
                        </button>
                    </form>
                </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                <h2 className="text-[16px] font-semibold">Recent account activity</h2>
                {entries.length === 0 ? (
                    <p className="mt-4 text-[14px] text-muted-foreground">No entries yet.</p>
                ) : (
                    <ul className="mt-4 divide-y divide-[#eef0f2] dark:divide-white/[0.08]">
                        {entries.map((row) => (
                            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[14px]">
                                <div>
                                    <p className="font-medium">
                                        {row.kind === "sale_charge" ? "Sale balance" : "Payment received"}
                                    </p>
                                    <p className="text-[12px] text-muted-foreground">
                                        {new Date(row.createdAt).toLocaleString("en-GH")}
                                        {row.note ? ` · ${row.note}` : ""}
                                    </p>
                                </div>
                                <span
                                    className={`font-semibold tabular-nums ${row.kind === "sale_charge" ? "text-amber-700 dark:text-amber-300" : "text-[#006c49] dark:text-[#6ffbbe]"}`}
                                >
                                    {row.kind === "sale_charge" ? "+" : "−"}
                                    {formatGhs(Number(row.amountGhs))}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="mt-6">
                <Link href="/dashboard/customers" className="text-[14px] font-medium text-[#006c49] hover:underline dark:text-[#6ffbbe]">
                    ← All customers
                </Link>
            </div>
        </ProductsPageShell>
    );
}
