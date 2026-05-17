"use client";

import Link from "next/link";
import useSWR from "swr";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Package, Search, User, X } from "lucide-react";
import { toast } from "sonner";
import { ProductsPageShell } from "../../products/products-page-shell";
import { useBranchContext } from "../../branch-context";
import { GHANA_PAYMENT_METHODS } from "./pos-payment-methods";
import {
    buildCustomerOrderAdvancePaymentReceiptData,
    resolveBranchReceiptMeta,
    type PosReceiptData,
} from "./pos-receipt-data";
import { PosReceiptStep } from "./pos-receipt-step";
import { useBranches } from "../../branches/branches-data-hooks";
import { usePosConfig } from "./pos-config-hooks";
import { useSession } from "../../../auth/use-session";
import type { CustomerRow } from "../../customers/customers-mock-data";

const fetcher = (url: string) =>
    fetch(url).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

const STORE_NAME = "Ventra POS";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

type OrderRow = {
    id: string;
    invoiceId: string;
    status: string;
    customerId: string;
    customerName?: string | null;
    totalGhs: string;
    amountPaidGhs: string;
    balanceDueGhs: string;
    createdAt: string;
};

type OrderDetailLine = {
    id: string;
    productName: string;
    quantity: number;
    lineTotalGhs: string;
};

type OrderDetailPayload = {
    order: {
        invoiceId: string;
        customerId: string;
        status: string;
        subtotalGhs: string;
        taxGhs: string;
        discountGhs: string;
        totalGhs: string;
        amountPaidGhs: string;
        balanceDueGhs: string;
    };
    lines: OrderDetailLine[];
    payments: { id: string; paymentMethod: string; amountGhs: string; createdAt: string }[];
    customerName?: string | null;
};

export function PosCustomerOrdersView() {
    const { branchId } = useBranchContext();
    const { branches = [] } = useBranches();
    const { config } = usePosConfig();
    const { user } = useSession();

    const branchMeta = useMemo(
        () => resolveBranchReceiptMeta(branches, branchId),
        [branches, branchId],
    );

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState("");
    const [payMethod, setPayMethod] = useState("cash");
    const [payBusy, setPayBusy] = useState(false);
    const [finalBusy, setFinalBusy] = useState(false);
    const [cancelBusy, setCancelBusy] = useState(false);
    const [advanceReceipt, setAdvanceReceipt] = useState<PosReceiptData | null>(null);

    const [filterCustomerId, setFilterCustomerId] = useState<string | null>(null);
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");

    const { data: customers = [] } = useSWR<CustomerRow[]>("/api/customers", fetcher);

    const filteredCustomers = useMemo(() => {
        const q = customerSearch.toLowerCase().trim();
        if (!q) return customers.slice(0, 8);
        return customers
            .filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    c.phone.toLowerCase().includes(q) ||
                    (c.email || "").toLowerCase().includes(q),
            )
            .slice(0, 8);
    }, [customers, customerSearch]);

    const filterCustomerLabel = useMemo(() => {
        if (!filterCustomerId) return null;
        return customers.find((c) => c.id === filterCustomerId)?.name ?? null;
    }, [filterCustomerId, customers]);

    const listKey =
        branchId && branchId !== "all"
            ? `/api/customer-orders${filterCustomerId ? `?customerId=${encodeURIComponent(filterCustomerId)}` : ""}`
            : null;
    const { data: listData, mutate: mutateList, isLoading: listLoading } = useSWR(listKey, fetcher);
    const orders: OrderRow[] = listData?.orders ?? [];

    const detailKey = selectedId ? `/api/customer-orders/${selectedId}` : null;
    const { data: detailData, mutate: mutateDetail, isLoading: detailLoading } = useSWR(
        detailKey,
        fetcher,
    );

    const addPayment = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!selectedId) return;
            const n = Number(payAmount);
            if (!Number.isFinite(n) || n <= 0) {
                toast.error("Enter a valid amount.");
                return;
            }
            const snapshot = detailData as OrderDetailPayload | undefined;
            if (!snapshot?.order) {
                toast.error("Load order details first.");
                return;
            }
            setPayBusy(true);
            try {
                const res = await fetch(`/api/customer-orders/${selectedId}/payments`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        paymentLines: [{ paymentMethod: payMethod, amountGhs: n }],
                    }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Payment failed");

                setAdvanceReceipt(
                    buildCustomerOrderAdvancePaymentReceiptData({
                        order: {
                            invoiceId: snapshot.order.invoiceId,
                            subtotalGhs: Number(snapshot.order.subtotalGhs),
                            taxGhs: Number(snapshot.order.taxGhs),
                            discountGhs: Number(snapshot.order.discountGhs),
                            totalGhs: Number(snapshot.order.totalGhs),
                        },
                        orderLines: snapshot.lines.map((l) => ({
                            productName: l.productName,
                            quantity: l.quantity,
                            lineTotalGhs: Number(l.lineTotalGhs),
                        })),
                        paymentLines: [{ paymentMethod: payMethod, amountGhs: n }],
                        balanceDueGhs:
                            typeof body.balanceDueGhs === "number" ? body.balanceDueGhs : 0,
                        customerName: snapshot.customerName ?? null,
                        storeName: config?.name?.trim() || STORE_NAME,
                        branchName: branchMeta.name,
                        branchLocation: branchMeta.location,
                        receiptHeader: config?.receiptHeader || undefined,
                        receiptFooter: config?.receiptFooter || undefined,
                        operatorName: user?.name || "SYSTEM",
                        currencySymbol: config?.currency || "GHS",
                    }),
                );

                toast.success("Payment recorded");
                setPayAmount("");
                await mutateList();
                await mutateDetail();
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Payment failed");
            } finally {
                setPayBusy(false);
            }
        },
        [
            selectedId,
            payAmount,
            payMethod,
            mutateList,
            mutateDetail,
            detailData,
            branchMeta,
            config,
            user?.name,
        ],
    );

    const finalize = useCallback(async () => {
        if (!selectedId) return;
        setFinalBusy(true);
        try {
            const res = await fetch(`/api/customer-orders/${selectedId}/finalize`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Finalize failed");
            toast.success("Pickup complete — sale recorded");
            setSelectedId(null);
            await mutateList();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Finalize failed");
        } finally {
            setFinalBusy(false);
        }
    }, [selectedId, mutateList]);

    const cancel = useCallback(async () => {
        if (!selectedId) return;
        if (!window.confirm("Cancel this order and release reserved stock?")) return;
        setCancelBusy(true);
        try {
            const res = await fetch(`/api/customer-orders/${selectedId}/cancel`, { method: "POST" });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : "Cancel failed");
            toast.success("Order cancelled");
            setSelectedId(null);
            await mutateList();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Cancel failed");
        } finally {
            setCancelBusy(false);
        }
    }, [selectedId, mutateList]);

    if (advanceReceipt) {
        return (
            <div className="min-h-full bg-[#F8F9FA] dark:bg-[#0a0a0a]">
                <PosReceiptStep
                    receiptData={advanceReceipt}
                    onNewSale={() => setAdvanceReceipt(null)}
                    title="Advance payment recorded"
                    description="Print or save this receipt for the customer."
                    primaryActionLabel="Back to orders"
                    onPrimaryAction={() => setAdvanceReceipt(null)}
                />
            </div>
        );
    }

    if (branchId === "all") {
        return (
            <ProductsPageShell
                title="Customer orders"
                description="Pay-and-hold orders for this branch."
                actions={
                    <Link
                        href="/dashboard/pos/sale"
                        className="inline-flex items-center gap-2 rounded-xl border border-[#eef0f2] px-4 py-2.5 text-[14px] font-semibold dark:border-white/10"
                    >
                        <ArrowLeft className="size-4" />
                        Back to POS
                    </Link>
                }
            >
                <p className="text-muted-foreground">Select a branch to manage customer orders.</p>
            </ProductsPageShell>
        );
    }

    return (
        <ProductsPageShell
            title="Customer orders"
            description="Pay in advance, pick up later. Stock is reserved until the sale is completed or the order is cancelled."
            actions={
                <Link
                    href="/dashboard/pos/sale"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#eef0f2] px-4 py-2.5 text-[14px] font-semibold dark:border-white/10"
                >
                    <ArrowLeft className="size-4" />
                    Back to POS
                </Link>
            }
        >
            <div className="mb-4 rounded-2xl border border-[#eef0f2] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111]">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Filter by customer
                </p>
                <div className="relative mt-2">
                    <button
                        type="button"
                        onClick={() => setCustomerSearchOpen((o) => !o)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-3 text-left dark:border-white/[0.08] dark:bg-[#1a1a1a]"
                    >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#111]">
                            <User className="size-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-semibold text-foreground">
                                {filterCustomerLabel || "All customers"}
                            </p>
                            <p className="truncate text-[12px] text-muted-foreground">
                                Search by name, phone, or email
                            </p>
                        </div>
                    </button>
                    {filterCustomerId ? (
                        <button
                            type="button"
                            onClick={() => setFilterCustomerId(null)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted/50"
                            aria-label="Clear customer filter"
                        >
                            <X className="size-4" />
                        </button>
                    ) : null}

                    {customerSearchOpen ? (
                        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-[#f0f2f4] bg-white p-2 shadow-2xl dark:border-white/[0.08] dark:bg-[#141414]">
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search customers…"
                                    value={customerSearch}
                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                    className="w-full rounded-xl border border-[#f0f2f4] bg-[#fafafa] py-2.5 pl-10 pr-4 text-[13px] outline-none focus:border-[#006c49]/40 dark:border-white/[0.08] dark:bg-[#1a1a1a]"
                                />
                            </div>
                            <div className="max-h-[240px] overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFilterCustomerId(null);
                                        setCustomerSearchOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                                >
                                    <span className="text-[14px] font-medium">All customers</span>
                                    {!filterCustomerId ? (
                                        <Check className="size-4 text-[#006c49] dark:text-[#6ffbbe]" />
                                    ) : null}
                                </button>
                                {filteredCustomers.map((c) => (
                                    <button
                                        type="button"
                                        key={c.id}
                                        onClick={() => {
                                            setFilterCustomerId(c.id);
                                            setCustomerSearchOpen(false);
                                        }}
                                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-[14px] font-medium">{c.name}</p>
                                            <p className="truncate text-[12px] text-muted-foreground">{c.phone}</p>
                                        </div>
                                        {filterCustomerId === c.id ? (
                                            <Check className="size-4 shrink-0 text-[#006c49] dark:text-[#6ffbbe]" />
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="rounded-2xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]">
                    {listLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="size-8 animate-spin text-muted-foreground opacity-30" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="px-6 py-12 text-center text-[14px] text-muted-foreground">
                            <Package className="mx-auto mb-3 size-10 opacity-30" />
                            {filterCustomerId
                                ? "No customer orders match this customer."
                                : "No open customer orders for this branch."}
                        </div>
                    ) : (
                        <ul className="divide-y divide-[#eef0f2] dark:divide-white/[0.08]">
                            {orders.map((o) => {
                                const bal = Number(o.balanceDueGhs);
                                const active = o.id === selectedId;
                                return (
                                    <li key={o.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(o.id)}
                                            className={`flex w-full flex-col items-start gap-1 px-5 py-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between ${
                                                active ? "bg-[#006c49]/[0.06] dark:bg-[#6ffbbe]/[0.07]" : "hover:bg-muted/30"
                                            }`}
                                        >
                                            <div>
                                                <p className="font-semibold text-foreground">{o.invoiceId}</p>
                                                {o.customerName ? (
                                                    <p className="text-[12px] text-muted-foreground">{o.customerName}</p>
                                                ) : null}
                                                <p className="text-[12px] text-muted-foreground">
                                                    {o.status.replace(/_/g, " ")} ·{" "}
                                                    {new Date(o.createdAt).toLocaleString("en-GH")}
                                                </p>
                                            </div>
                                            <div className="text-right text-[13px]">
                                                <p className="tabular-nums text-muted-foreground">
                                                    Total {formatGhs(Number(o.totalGhs))}
                                                </p>
                                                {bal > 0.02 ? (
                                                    <p className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                                                        Balance {formatGhs(bal)}
                                                    </p>
                                                ) : (
                                                    <p className="font-medium text-[#006c49] dark:text-[#6ffbbe]">
                                                        Paid — ready for pickup
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="rounded-2xl border border-[#eef0f2] bg-white p-5 dark:border-white/[0.08] dark:bg-[#111]">
                    {!selectedId ? (
                        <p className="text-[14px] text-muted-foreground">
                            Select an order to add a payment or complete pickup.
                        </p>
                    ) : detailLoading || !detailData ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="size-7 animate-spin text-muted-foreground opacity-30" />
                        </div>
                    ) : (
                        <>
                            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                                {detailData.order.invoiceId}
                            </h2>
                            <p className="mt-1 text-[12px] text-muted-foreground capitalize">
                                {detailData.order.status.replace(/_/g, " ")}
                            </p>
                            <dl className="mt-4 space-y-2 text-[13px]">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Total</dt>
                                    <dd className="font-medium tabular-nums">
                                        {formatGhs(Number(detailData.order.totalGhs))}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Paid</dt>
                                    <dd className="font-medium tabular-nums">
                                        {formatGhs(Number(detailData.order.amountPaidGhs))}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Balance</dt>
                                    <dd className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                                        {formatGhs(Number(detailData.order.balanceDueGhs))}
                                    </dd>
                                </div>
                            </dl>

                            <div className="mt-5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Lines
                                </p>
                                <ul className="mt-2 space-y-2 text-[13px]">
                                    {(
                                        detailData.lines as {
                                            id: string;
                                            productName: string;
                                            quantity: number;
                                            lineTotalGhs: string;
                                        }[]
                                    ).map((l) => (
                                        <li key={l.id} className="flex justify-between gap-2">
                                            <span className="min-w-0 truncate">
                                                {l.productName} ×{l.quantity}
                                            </span>
                                            <span className="shrink-0 tabular-nums">
                                                {formatGhs(Number(l.lineTotalGhs))}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-5">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Payments
                                </p>
                                <ul className="mt-2 space-y-1.5 text-[12px] text-muted-foreground">
                                    {(
                                        detailData.payments as {
                                            id: string;
                                            paymentMethod: string;
                                            amountGhs: string;
                                            createdAt: string;
                                        }[]
                                    ).length === 0 ? (
                                        <li>—</li>
                                    ) : null}
                                    {(
                                        detailData.payments as {
                                            id: string;
                                            paymentMethod: string;
                                            amountGhs: string;
                                            createdAt: string;
                                        }[]
                                    ).map((p) => (
                                        <li key={p.id} className="flex justify-between">
                                            <span className="capitalize">{p.paymentMethod}</span>
                                            <span className="tabular-nums">{formatGhs(Number(p.amountGhs))}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {detailData.order.status === "open" ? (
                                <form onSubmit={addPayment} className="mt-6 space-y-3 border-t border-[#eef0f2] pt-5 dark:border-white/[0.08]">
                                    <p className="text-[14px] font-semibold">Add payment</p>
                                    <div>
                                        <label className="text-[12px] text-muted-foreground">Amount</label>
                                        <input
                                            type="number"
                                            min={0.01}
                                            step="0.01"
                                            value={payAmount}
                                            onChange={(e) => setPayAmount(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 dark:border-white/12"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[12px] text-muted-foreground">Method</label>
                                        <select
                                            value={payMethod}
                                            onChange={(e) => setPayMethod(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 dark:border-white/12 dark:bg-[#141414]"
                                        >
                                            {GHANA_PAYMENT_METHODS.map((m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={payBusy}
                                        className="w-full rounded-xl bg-[#006c49] py-2.5 text-[14px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                                    >
                                        {payBusy ? "Saving…" : "Apply payment"}
                                    </button>
                                </form>
                            ) : null}

                            {detailData.order.status === "ready_for_pickup" ? (
                                <button
                                    type="button"
                                    disabled={finalBusy}
                                    onClick={() => void finalize()}
                                    className="mt-6 w-full rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
                                >
                                    {finalBusy ? "Completing…" : "Complete pickup (record sale)"}
                                </button>
                            ) : null}

                            {detailData.order.status === "open" ||
                            detailData.order.status === "ready_for_pickup" ? (
                                <button
                                    type="button"
                                    disabled={cancelBusy}
                                    onClick={() => void cancel()}
                                    className="mt-3 w-full rounded-xl border border-red-200 py-2.5 text-[13px] font-semibold text-red-700 dark:border-red-900/50 dark:text-red-400"
                                >
                                    {cancelBusy ? "Cancelling…" : "Cancel order"}
                                </button>
                            ) : null}

                            <Link
                                href={`/dashboard/customers/${detailData.order.customerId}`}
                                className="mt-4 inline-block text-[13px] font-medium text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                            >
                                View customer profile
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </ProductsPageShell>
    );
}
