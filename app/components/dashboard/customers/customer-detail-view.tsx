"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
    ArrowLeft,
    Loader2,
    Pencil,
    Printer,
    ShoppingBag,
} from "lucide-react";
import { GHANA_PAYMENT_METHODS } from "../pos/sale/pos-payment-methods";
import { parseAmountInput } from "@/app/lib/parse-amount";
import { AmountInput } from "@/app/components/dashboard/ui/amount-input";
import { buildReceiptDataFromCompletedSale } from "../pos/sale/pos-receipt-data";
import { printReceiptHtml } from "../pos/sale/pos-print-utils";

const fetcher = (url: string) =>
    fetch(url, { cache: "no-store" }).then((r) => {
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

function formatWhen(iso: string | null | undefined): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function payLabel(method: string): string {
    return GHANA_PAYMENT_METHODS.find((m) => m.id === method)?.shortLabel ?? method;
}

function statusLabel(status: string): string {
    if (status === "completed") return "Done";
    if (status === "partially_refunded") return "Partial";
    if (status === "refunded") return "Returned";
    if (status === "voided") return "Void";
    return status.replace(/_/g, " ");
}

type Tab = "receipts" | "buys" | "account";

type ReceiptRow = {
    id: string;
    invoiceId: string;
    totalGhs: string;
    amountPaidGhs: string;
    balanceDueGhs: string;
    paymentMethod: string;
    itemCount: number;
    status: string;
    createdAt: string;
    staffName: string | null;
};

type BuyRow = {
    productId: string | null;
    productName: string;
    quantity: number;
    spentGhs: number;
    lastBoughtAt: string | null;
};

export function CustomerDetailView({ customerId }: { customerId: string }) {
    const { data, isLoading, error, mutate } = useSWR(
        customerId ? `/api/customers/${customerId}/profile` : null,
        fetcher,
        { revalidateOnMount: true, revalidateOnFocus: true },
    );
    const [tab, setTab] = useState<Tab>("receipts");
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("cash");
    const [payNote, setPayNote] = useState("");
    const [paying, setPaying] = useState(false);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);
    const [receiptLines, setReceiptLines] = useState<
        Record<string, { productName: string; quantity: number; lineTotalGhs: string }[]>
    >({});

    async function submitPayment(e: FormEvent) {
        e.preventDefault();
        const n = parseAmountInput(payAmount);
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

    async function loadLines(saleId: string) {
        if (receiptLines[saleId]) {
            setOpenReceiptId((cur) => (cur === saleId ? null : saleId));
            return;
        }
        try {
            const res = await fetch(`/api/customers/${customerId}/sales/${saleId}`);
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Could not load sale");
            setReceiptLines((prev) => ({ ...prev, [saleId]: body.lines ?? [] }));
            setOpenReceiptId(saleId);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Could not load sale");
        }
    }

    async function reprint(saleId: string) {
        if (printingId) return;
        setPrintingId(saleId);
        try {
            const res = await fetch(`/api/customers/${customerId}/sales/${saleId}`);
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error || "Could not load receipt");
            const receipt = buildReceiptDataFromCompletedSale({
                sale: body.sale,
                lines: body.lines ?? [],
                payments: body.payments,
            });
            await printReceiptHtml(receipt);
            toast.success("Receipt sent to printer");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Could not print");
        } finally {
            setPrintingId(null);
        }
    }

    const initials = useMemo(() => {
        const name = String(data?.customer?.name ?? "");
        return name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    }, [data?.customer?.name]);

    if (isLoading) {
        return (
            <div className="flex h-full min-h-0 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data?.customer) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
                <p className="text-destructive">Could not load this customer.</p>
                <Link
                    href="/dashboard/customers"
                    className="mt-3 text-[14px] font-semibold text-[#006c49] underline dark:text-[#6ffbbe]"
                >
                    Back to customers
                </Link>
            </div>
        );
    }

    const c = data.customer as {
        name: string;
        phone: string;
        email: string | null;
        status: string;
        createdAt: string;
    };
    const stats = data.stats as {
        visits: number;
        spentGhs: number;
        paidGhs: number;
        owedGhs: number;
        avgSaleGhs: number;
        itemsBought: number;
        lastVisitAt: string | null;
        firstVisitAt: string | null;
    };
    const receipts = (data.receipts ?? []) as ReceiptRow[];
    const products = (data.products ?? []) as BuyRow[];
    const entries = (data.entries ?? []) as Array<{
        id: string;
        kind: string;
        amountGhs: string;
        note: string | null;
        createdAt: string;
    }>;
    const orders = (data.orders ?? []) as Array<{
        id: string;
        invoiceId: string;
        status: string;
        totalGhs: string;
        balanceDueGhs: string;
        createdAt: string;
    }>;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-3 px-3 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:gap-4 lg:px-6 lg:pb-4">
                <header className="flex shrink-0 items-center gap-3">
                    <Link
                        href="/dashboard/customers"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        aria-label="Back to customers"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] text-[11px] font-bold text-white">
                        {initials || "C"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-tight">
                            {c.name}
                        </h1>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {[c.phone, c.email].filter(Boolean).join(" · ")}
                        </p>
                    </div>
                    <p
                        className="hidden font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-amber-700 sm:block dark:text-amber-300"
                        title="Amount owed"
                    >
                        {formatGhs(stats.owedGhs)}
                    </p>
                    <Link
                        href={`/dashboard/customers/${customerId}/edit`}
                        className="inline-flex size-9 items-center justify-center rounded-xl border border-border hover:bg-muted/50"
                        aria-label="Edit customer"
                    >
                        <Pencil className="size-3.5" />
                    </Link>
                </header>

                <section className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Visits" value={String(stats.visits)} />
                    <Stat label="Spent" value={formatGhs(stats.spentGhs)} />
                    <Stat label="Avg" value={formatGhs(stats.avgSaleGhs)} />
                    <Stat label="Last" value={stats.lastVisitAt ? formatWhen(stats.lastVisitAt) : "—"} />
                </section>

                <div className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
                    {(
                        [
                            ["receipts", "Receipts"],
                            ["buys", "Buys"],
                            ["account", "Account"],
                        ] as const
                    ).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                                tab === id
                                    ? "bg-white text-foreground shadow-sm dark:bg-[#1a1a1a]"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface-card dark:bg-[#111]">
                    {tab === "receipts" ? (
                        <div className="custom-scrollbar flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
                            {!receipts.length ? (
                                <p className="p-6 text-[13px] text-muted-foreground">No receipts yet.</p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {receipts.map((r) => {
                                        const open = openReceiptId === r.id;
                                        const lines = receiptLines[r.id] ?? [];
                                        return (
                                            <li key={r.id} className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => loadLines(r.id)}
                                                        className="min-w-0 flex-1 text-left"
                                                    >
                                                        <p className="truncate text-[14px] font-semibold">{r.invoiceId}</p>
                                                        <p className="text-[12px] text-muted-foreground">
                                                            {formatWhen(r.createdAt)}
                                                            {r.staffName ? ` · ${r.staffName}` : ""} · {payLabel(r.paymentMethod)} ·{" "}
                                                            {r.itemCount} items
                                                        </p>
                                                    </button>
                                                    <div className="text-right">
                                                        <p className="text-[14px] font-semibold tabular-nums">
                                                            {formatGhs(Number(r.totalGhs))}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">{statusLabel(r.status)}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => reprint(r.id)}
                                                        disabled={printingId === r.id}
                                                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] font-semibold hover:bg-muted/40 disabled:opacity-50"
                                                    >
                                                        {printingId === r.id ? (
                                                            <Loader2 className="size-3.5 animate-spin" />
                                                        ) : (
                                                            <Printer className="size-3.5" />
                                                        )}
                                                        Print
                                                    </button>
                                                </div>
                                                {open ? (
                                                    <ul className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-[13px]">
                                                        {lines.length === 0 ? (
                                                            <li className="text-muted-foreground">No lines</li>
                                                        ) : (
                                                            lines.map((l, i) => (
                                                                <li
                                                                    key={`${r.id}-${i}`}
                                                                    className="flex justify-between gap-3 py-1"
                                                                >
                                                                    <span>
                                                                        {l.productName}{" "}
                                                                        <span className="text-muted-foreground">×{l.quantity}</span>
                                                                    </span>
                                                                    <span className="tabular-nums">
                                                                        {formatGhs(Number(l.lineTotalGhs))}
                                                                    </span>
                                                                </li>
                                                            ))
                                                        )}
                                                    </ul>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    ) : null}

                    {tab === "buys" ? (
                        <div className="custom-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain">
                            {!products.length ? (
                                <p className="p-6 text-[13px] text-muted-foreground">Nothing bought yet.</p>
                            ) : (
                                <table className="w-full text-left text-[13px]">
                                    <thead className="sticky top-0 border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2.5">Item</th>
                                            <th className="px-3 py-2.5 text-right">Qty</th>
                                            <th className="px-3 py-2.5 text-right">Spent</th>
                                            <th className="px-4 py-2.5 text-right">Last</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {products.map((p, i) => (
                                            <tr key={`${p.productId ?? p.productName}-${i}`}>
                                                <td className="px-4 py-2.5 font-medium">
                                                    <span className="inline-flex items-center gap-2">
                                                        <ShoppingBag className="size-3.5 text-muted-foreground" />
                                                        {p.productName}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">{p.quantity}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">
                                                    {formatGhs(p.spentGhs)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">
                                                    {p.lastBoughtAt
                                                        ? new Date(p.lastBoughtAt).toLocaleDateString("en-GH")
                                                        : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : null}

                    {tab === "account" ? (
                        <div className="custom-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain p-4">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-xl border border-border p-4">
                                    <p className="text-[12px] font-semibold text-muted-foreground">Owed</p>
                                    <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
                                        {formatGhs(stats.owedGhs)}
                                    </p>
                                    <form onSubmit={submitPayment} className="mt-4 space-y-3">
                                        <AmountInput
                                            value={payAmount}
                                            onChange={setPayAmount}
                                            placeholder="Amount"
                                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-[14px]"
                                        />
                                        <select
                                            value={payMethod}
                                            onChange={(e) => setPayMethod(e.target.value)}
                                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-[14px] dark:bg-[#141414]"
                                        >
                                            {GHANA_PAYMENT_METHODS.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            value={payNote}
                                            onChange={(e) => setPayNote(e.target.value)}
                                            placeholder="Note"
                                            className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-[14px]"
                                        />
                                        <button
                                            type="submit"
                                            disabled={paying || stats.owedGhs < 0.02}
                                            className="w-full rounded-xl bg-[#006c49] py-2.5 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003527]"
                                        >
                                            {paying ? "Saving…" : "Apply"}
                                        </button>
                                    </form>
                                </div>
                                <div className="rounded-xl border border-border p-4">
                                    <p className="text-[13px] font-semibold">Holds</p>
                                    {!orders.length ? (
                                        <p className="mt-3 text-[13px] text-muted-foreground">None</p>
                                    ) : (
                                        <ul className="mt-2 divide-y divide-border">
                                            {orders.map((o) => (
                                                <li key={o.id} className="flex justify-between gap-2 py-2 text-[13px]">
                                                    <div>
                                                        <p className="font-medium">{o.invoiceId}</p>
                                                        <p className="text-[12px] capitalize text-muted-foreground">
                                                            {o.status.replace(/_/g, " ")} ·{" "}
                                                            {new Date(o.createdAt).toLocaleDateString("en-GH")}
                                                        </p>
                                                    </div>
                                                    <p className="tabular-nums">{formatGhs(Number(o.totalGhs))}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 rounded-xl border border-border p-4">
                                <p className="text-[13px] font-semibold">Ledger</p>
                                {!entries.length ? (
                                    <p className="mt-3 text-[13px] text-muted-foreground">No entries</p>
                                ) : (
                                    <ul className="mt-2 divide-y divide-border">
                                        {entries.map((row) => (
                                            <li
                                                key={row.id}
                                                className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px]"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {row.kind === "sale_charge" ? "Sale" : "Payment"}
                                                    </p>
                                                    <p className="text-[12px] text-muted-foreground">
                                                        {formatWhen(row.createdAt)}
                                                        {row.note ? ` · ${row.note}` : ""}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`font-semibold tabular-nums ${
                                                        row.kind === "sale_charge"
                                                            ? "text-amber-700 dark:text-amber-300"
                                                            : "text-[#006c49] dark:text-[#6ffbbe]"
                                                    }`}
                                                >
                                                    {row.kind === "sale_charge" ? "+" : "−"}
                                                    {formatGhs(Number(row.amountGhs))}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-border bg-surface-card px-3 py-2 dark:bg-[#111]">
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold tabular-nums sm:text-[14px]">{value}</p>
        </div>
    );
}
