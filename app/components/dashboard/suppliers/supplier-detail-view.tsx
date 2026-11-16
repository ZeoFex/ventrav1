"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect, type FormEvent } from "react";
import useSWR from "swr";
import {
    ArrowLeft,
    Download,
    Loader2,
    Pencil,
    Plus,
    Printer,
    Trash2,
    Truck,
} from "lucide-react";
import { useProducts, useCategories } from "../products/products-data-hooks";
import type { Product } from "@/app/lib/offline/offline-db";
import { toast } from "sonner";
import { parseAmountInput } from "@/app/lib/parse-amount";
import { AmountInput } from "@/app/components/dashboard/ui/amount-input";
import { DeleteConfirmModal } from "./delete-confirm-modal";

const SUPPLY_PAYMENT_METHODS = [
    { value: "cash", label: "Cash" },
    { value: "mtn_momo", label: "MTN Mobile Money" },
    { value: "vodafone_cash", label: "Vodafone Cash" },
    { value: "atmoney", label: "AT Money" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank transfer" },
    { value: "other", label: "Other" },
] as const;

const CARTON_PRESETS = [1, 2, 3, 5, 6, 10, 12, 24, 48] as const;

function generateGrnReference(): string {
    const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(new Date());
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `GRN-${dateKey.replace(/-/g, "")}-${suffix}`;
}

function labelForPaymentMethod(v: string | null | undefined): string {
    if (!v) return "—";
    const hit = SUPPLY_PAYMENT_METHODS.find((m) => m.value === v);
    return hit ? hit.label : v;
}

function labelPaymentStatus(s: string): string {
    if (s === "unpaid") return "Unpaid";
    if (s === "partial") return "Partial";
    if (s === "paid") return "Paid";
    return s;
}

function paymentStatusClass(s: string): string {
    if (s === "paid") {
        return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300";
    }
    if (s === "partial") {
        return "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
    }
    return "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
}

const fieldClass =
    "w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#006c49]/50 dark:border-white/[0.12] dark:bg-[#0f0f0f]";

type LineDraft = {
    id: string;
    productId: string | null;
    productName: string;
    categoryName: string | null;
    cartons: number;
    itemsPerCarton: number;
    /** When set, overrides cartons × itemsPerCarton. */
    manualTotalItems: number | null;
    unitCostGhs: number;
    batchNo: string;
    expiryDate: string;
    lineNotes: string;
};

function lineQuantity(l: LineDraft): number {
    if (l.manualTotalItems != null) return Math.max(0, Math.floor(l.manualTotalItems));
    const c = Math.max(0, l.cartons);
    const ipc = Math.max(1, l.itemsPerCarton);
    if (c <= 0) return 0;
    return c * ipc;
}

function newLine(): LineDraft {
    return {
        id: crypto.randomUUID(),
        productId: null,
        productName: "",
        categoryName: null,
        cartons: 0,
        itemsPerCarton: 1,
        manualTotalItems: null,
        unitCostGhs: 0,
        batchNo: "",
        expiryDate: "",
        lineNotes: "",
    };
}

const fetcher = (u: string) =>
    fetch(u).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

export function SupplierDetailView({ supplierId }: { supplierId: string }) {
    const router = useRouter();
    const { data, isLoading, error, mutate } = useSWR(`/api/suppliers/${supplierId}`, fetcher);
    const { products = [] } = useProducts();
    const { categories = [] } = useCategories();

    const [reference, setReference] = useState("");
    const [referenceTouched, setReferenceTouched] = useState(false);
    const [amountPaidGhs, setAmountPaidGhs] = useState("0");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [supplyNotes, setSupplyNotes] = useState("");
    const [lines, setLines] = useState<LineDraft[]>([newLine()]);
    const [submitting, setSubmitting] = useState(false);
    const [pendingSupply, setPendingSupply] = useState<Record<string, unknown> | null>(null);
    const [deletingSupply, setDeletingSupply] = useState(false);
    const [pendingDeleteSupplier, setPendingDeleteSupplier] = useState(false);
    const [deletingSupplier, setDeletingSupplier] = useState(false);
    const [mobileTab, setMobileTab] = useState<"form" | "history">("form");

    useEffect(() => {
        if (!referenceTouched && !reference.trim()) {
            setReference(generateGrnReference());
        }
    }, [reference, referenceTouched]);

    const productById = useMemo(() => {
        const m = new Map<string, Product>();
        for (const p of products as Product[]) m.set(p.id, p);
        return m;
    }, [products]);

    const categoryById = useMemo(() => {
        const m = new Map<string, { id: string; name: string }>();
        for (const c of categories as { id: string; name: string }[]) m.set(c.id, c);
        return m;
    }, [categories]);

    const applyProduct = useCallback(
        (lineId: string, productId: string) => {
            const p = productById.get(productId);
            const catName = p?.categoryId ? categoryById.get(p.categoryId)?.name ?? null : null;
            setLines((prev) =>
                prev.map((l) =>
                    l.id === lineId
                        ? {
                              ...l,
                              productId,
                              productName: p?.name ?? "",
                              categoryName: catName,
                          }
                        : l,
                ),
            );
        },
        [productById, categoryById],
    );

    function updateLine(lineId: string, patch: Partial<LineDraft>) {
        setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
    }

    const validLines = useMemo(
        () => lines.filter((l) => l.productName.trim() && lineQuantity(l) >= 1),
        [lines],
    );

    const summary = useMemo(() => {
        let totalCost = 0;
        let totalItems = 0;
        for (const l of validLines) {
            const qty = lineQuantity(l);
            const unit = Math.max(0, l.unitCostGhs);
            totalCost += Math.round(qty * unit * 100) / 100;
            totalItems += qty;
        }
        const paid = Math.max(0, parseAmountInput(amountPaidGhs) || 0);
        return {
            totalProducts: validLines.length,
            totalItems,
            totalCost,
            totalPaid: paid,
            totalBalance: Math.round((totalCost - paid) * 100) / 100,
        };
    }, [validLines, amountPaidGhs]);

    async function handleRecordSupply(e: FormEvent) {
        e.preventDefault();
        if (!reference.trim()) {
            toast.error("Reference / invoice # is required");
            return;
        }
        const paid = Number(amountPaidGhs);
        if (Number.isNaN(paid) || paid < 0) {
            toast.error("Invalid amount paid");
            return;
        }
        const payloadLines = validLines.map((l) => {
            const qty = lineQuantity(l);
            const unit = Math.max(0, l.unitCostGhs);
            const lineTotal = Math.round(qty * unit * 100) / 100;
            return {
                productId: l.productId,
                productName: l.productName.trim(),
                categoryName: l.categoryName?.trim() || null,
                cartons: Math.max(0, l.cartons),
                itemsPerCarton: Math.max(1, l.itemsPerCarton),
                quantityTotal: qty,
                unitCostGhs: unit,
                lineTotalGhs: lineTotal,
                batchNo: l.batchNo.trim() || null,
                expiryDate: l.expiryDate.trim() || null,
                notes: l.lineNotes.trim() || null,
            };
        });
        if (payloadLines.length === 0) {
            toast.error("Add at least one complete line (product name, quantities, cost)");
            return;
        }
        setSubmitting(true);
        try {
            const idempotencyKey =
                typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
            const res = await fetch("/api/supply-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    supplierId,
                    reference: reference.trim().slice(0, 80),
                    amountPaidGhs: paid,
                    paymentMethod,
                    notes: supplyNotes.trim() || null,
                    idempotencyKey,
                    lines: payloadLines,
                }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "Failed to save supply");
            toast.success("Supply recorded. Stock updated for linked catalog products.");
            setMobileTab("history");
            setReference(generateGrnReference());
            setReferenceTouched(false);
            setAmountPaidGhs("0");
            setPaymentMethod("cash");
            setSupplyNotes("");
            setLines([newLine()]);
            await mutate();
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed");
        } finally {
            setSubmitting(false);
        }
    }

    async function confirmDeleteSupply() {
        if (!pendingSupply || deletingSupply) return;
        const id = String(pendingSupply.id ?? "");
        if (!id) return;
        setDeletingSupply(true);
        try {
            const res = await fetch(`/api/supply-orders/${id}`, { method: "DELETE" });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "Failed to delete supply");
            toast.success("Supply deleted. Stock reversed for linked catalog products.");
            setPendingSupply(null);
            await mutate();
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete supply");
        } finally {
            setDeletingSupply(false);
        }
    }

    async function confirmDeleteSupplier() {
        if (deletingSupplier) return;
        setDeletingSupplier(true);
        try {
            const res = await fetch(`/api/suppliers/${supplierId}`, { method: "DELETE" });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "Failed to delete supplier");
            toast.success("Supplier deleted");
            setPendingDeleteSupplier(false);
            router.push("/dashboard/suppliers");
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete supplier");
            setDeletingSupplier(false);
        }
    }

    function handlePrintDraft() {
        window.print();
    }

    function handleDownloadPdf() {
        toast.message("PDF download will be available in a future update. Use Print and save as PDF for now.");
    }

    if (isLoading) {
        return (
            <div className="flex h-full min-h-0 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data?.supplier) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
                <p className="text-destructive">Could not load supplier.</p>
                <Link href="/dashboard/suppliers" className="mt-3 text-[14px] font-semibold text-[#006c49] underline dark:text-[#6ffbbe]">
                    Back to supplier list
                </Link>
            </div>
        );
    }

    const s = data.supplier;
    const outstanding = Number(data.outstandingGhs ?? 0);
    const supplies = data.supplies ?? [];
    const phones = (s.phones ?? []) as { phone: string }[];

    return (
        <>
            <div className="flex h-full min-h-0 flex-col overflow-hidden print:hidden">
                <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-3 px-3 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:gap-4 lg:px-6 lg:pb-4">
                    <header className="flex shrink-0 items-center gap-3">
                        <Link
                            href="/dashboard/suppliers"
                            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            aria-label="Back to suppliers"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                            <Truck className="size-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-tight text-foreground sm:text-lg">
                                {s.name}
                            </h1>
                            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                                {[
                                    s.truckNumber || null,
                                    phones.length ? phones.map((p) => p.phone).join(" · ") : null,
                                    s.email || null,
                                ]
                                    .filter(Boolean)
                                    .join(" · ") || (s.type === "business" ? "Business" : "Individual")}
                            </p>
                        </div>
                        <div className="hidden items-baseline gap-5 sm:flex">
                            <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]" title="Amount owed">
                                ₵{outstanding.toFixed(2)}
                            </p>
                            <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-muted-foreground" title="Supply records">
                                {supplies.length}
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                            <Link
                                href={`/dashboard/suppliers/${supplierId}/edit`}
                                className="inline-flex size-9 items-center justify-center rounded-xl border border-border hover:bg-muted/50"
                                aria-label="Edit supplier"
                            >
                                <Pencil className="size-3.5" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => setPendingDeleteSupplier(true)}
                                className="inline-flex size-9 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
                                aria-label="Delete supplier"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    </header>
                    <div className="flex shrink-0 items-baseline justify-between gap-4 px-1 sm:hidden">
                        <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                            ₵{outstanding.toFixed(2)}
                        </p>
                        <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-muted-foreground">
                            {supplies.length}
                        </p>
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1 lg:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileTab("form")}
                            className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                                mobileTab === "form"
                                    ? "bg-white text-foreground shadow-sm dark:bg-[#1a1a1a]"
                                    : "text-muted-foreground"
                            }`}
                        >
                            New
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileTab("history")}
                            className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                                mobileTab === "history"
                                    ? "bg-white text-foreground shadow-sm dark:bg-[#1a1a1a]"
                                    : "text-muted-foreground"
                            }`}
                        >
                            History
                        </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
                        <section
                            className={`${mobileTab === "form" ? "flex" : "hidden"} min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111] lg:flex`}
                        >
                            <form onSubmit={handleRecordSupply} className="flex min-h-0 flex-1 flex-col">
                                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#eef0f2] px-4 py-2.5 dark:border-white/[0.08]">
                                    <h2 className="text-[14px] font-semibold">New</h2>
                                    <button
                                        type="button"
                                        onClick={() => setLines((p) => [...p, newLine()])}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-semibold text-[#006c49] hover:bg-[#006c49]/10 dark:text-[#6ffbbe]"
                                    >
                                        <Plus className="size-4" /> Row
                                    </button>
                                </div>

                                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                                                Reference
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    required
                                                    value={reference}
                                                    onChange={(e) => {
                                                        setReferenceTouched(true);
                                                        setReference(e.target.value);
                                                    }}
                                                    placeholder="Invoice # / waybill"
                                                    className={fieldClass}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setReference(generateGrnReference());
                                                        setReferenceTouched(false);
                                                    }}
                                                    className="shrink-0 rounded-xl border border-[#e5e7eb] px-3 py-2 text-[12px] font-semibold hover:bg-muted/40 dark:border-white/[0.12]"
                                                >
                                                    New #
                                                </button>
                                            </div>
                                        </div>

                                        {lines.map((line) => {
                                            const qty = lineQuantity(line);
                                            const lineTotal =
                                                Math.round(qty * Math.max(0, line.unitCostGhs) * 100) / 100;
                                            return (
                                                <div
                                                    key={line.id}
                                                    className="space-y-3 rounded-xl border border-[#eef0f2] bg-[#fafbfc] p-3 dark:border-white/[0.08] dark:bg-[#0c0c0c]"
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                                                            <div>
                                                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                    Catalog product
                                                                </label>
                                                                <select
                                                                    value={line.productId ?? ""}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        if (!v) {
                                                                            updateLine(line.id, { productId: null });
                                                                            return;
                                                                        }
                                                                        applyProduct(line.id, v);
                                                                    }}
                                                                    className={fieldClass}
                                                                >
                                                                    <option value="">Type name below</option>
                                                                    {(products as Product[]).map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                    Category
                                                                </label>
                                                                <select
                                                                    value={line.categoryName ?? ""}
                                                                    onChange={(e) =>
                                                                        updateLine(line.id, {
                                                                            categoryName: e.target.value || null,
                                                                        })
                                                                    }
                                                                    className={fieldClass}
                                                                >
                                                                    <option value="">Select category</option>
                                                                    {(categories as { id: string; name: string }[]).map((c) => (
                                                                        <option key={c.id} value={c.name}>
                                                                            {c.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setLines((p) =>
                                                                    p.length <= 1 ? p : p.filter((x) => x.id !== line.id),
                                                                )
                                                            }
                                                            className="mt-6 rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive"
                                                            aria-label="Remove line"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                            Product name
                                                        </label>
                                                        <input
                                                            value={line.productName}
                                                            onChange={(e) =>
                                                                updateLine(line.id, { productName: e.target.value })
                                                            }
                                                            className={fieldClass}
                                                        />
                                                        {!line.productId && line.productName.trim() ? (
                                                            <Link
                                                                href={`/dashboard/products/new?name=${encodeURIComponent(line.productName.trim())}`}
                                                                className="mt-1 inline-flex text-[12px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
                                                            >
                                                                Add &quot;{line.productName.trim()}&quot; to catalog →
                                                            </Link>
                                                        ) : null}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Cartons
                                                            </label>
                                                            <select
                                                                value={
                                                                    CARTON_PRESETS.includes(
                                                                        line.cartons as (typeof CARTON_PRESETS)[number],
                                                                    )
                                                                        ? String(line.cartons)
                                                                        : "custom"
                                                                }
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    if (v === "custom") return;
                                                                    updateLine(line.id, {
                                                                        cartons: parseInt(v, 10) || 1,
                                                                        manualTotalItems: null,
                                                                    });
                                                                }}
                                                                className={fieldClass}
                                                            >
                                                                {CARTON_PRESETS.map((n) => (
                                                                    <option key={n} value={n}>
                                                                        {n}
                                                                    </option>
                                                                ))}
                                                                <option value="custom">Custom…</option>
                                                            </select>
                                                            {!CARTON_PRESETS.includes(
                                                                line.cartons as (typeof CARTON_PRESETS)[number],
                                                            ) ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={line.cartons}
                                                                    onChange={(e) =>
                                                                        updateLine(line.id, {
                                                                            cartons: Math.max(
                                                                                0,
                                                                                parseInt(e.target.value, 10) || 0,
                                                                            ),
                                                                            manualTotalItems: null,
                                                                        })
                                                                    }
                                                                    className={`mt-1 ${fieldClass}`}
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Items / carton
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={line.itemsPerCarton}
                                                                onChange={(e) =>
                                                                    updateLine(line.id, {
                                                                        itemsPerCarton: Math.max(
                                                                            1,
                                                                            parseInt(e.target.value, 10) || 1,
                                                                        ),
                                                                        manualTotalItems: null,
                                                                    })
                                                                }
                                                                className={fieldClass}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Total items
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={
                                                                    line.manualTotalItems != null
                                                                        ? line.manualTotalItems
                                                                        : qty
                                                                }
                                                                onChange={(e) => {
                                                                    const raw = parseInt(e.target.value, 10);
                                                                    const def = (() => {
                                                                        const c = Math.max(0, line.cartons);
                                                                        const ipc = Math.max(1, line.itemsPerCarton);
                                                                        return c > 0 ? c * ipc : 1;
                                                                    })();
                                                                    const n = Number.isNaN(raw) ? def : Math.max(1, raw);
                                                                    updateLine(line.id, {
                                                                        manualTotalItems: n === def ? null : n,
                                                                    });
                                                                }}
                                                                className={fieldClass}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Cost / item ₵
                                                            </label>
                                                            <AmountInput
                                                                placeholder="0.00"
                                                                value={line.unitCostGhs || ""}
                                                                onChange={(next) =>
                                                                    updateLine(line.id, {
                                                                        unitCostGhs: Math.max(
                                                                            0,
                                                                            parseAmountInput(next) || 0,
                                                                        ),
                                                                    })
                                                                }
                                                                className={fieldClass}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Batch no
                                                            </label>
                                                            <input
                                                                value={line.batchNo}
                                                                onChange={(e) =>
                                                                    updateLine(line.id, { batchNo: e.target.value })
                                                                }
                                                                className={fieldClass}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Expiry
                                                            </label>
                                                            <input
                                                                type="date"
                                                                value={line.expiryDate}
                                                                onChange={(e) =>
                                                                    updateLine(line.id, { expiryDate: e.target.value })
                                                                }
                                                                className={fieldClass}
                                                            />
                                                        </div>
                                                        <div className="col-span-2 sm:col-span-1">
                                                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                                Line total
                                                            </label>
                                                            <p className="rounded-xl border border-transparent bg-white px-3 py-2 text-[13px] font-semibold tabular-nums dark:bg-[#111]">
                                                                ₵{lineTotal.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                                                            Line notes
                                                        </label>
                                                        <input
                                                            value={line.lineNotes}
                                                            onChange={(e) =>
                                                                updateLine(line.id, { lineNotes: e.target.value })
                                                            }
                                                            className={fieldClass}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                                                    Payment method
                                                </label>
                                                <select
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className={fieldClass}
                                                >
                                                    {SUPPLY_PAYMENT_METHODS.map((m) => (
                                                        <option key={m.value} value={m.value}>
                                                            {m.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                                                    Amount paid (₵)
                                                </label>
                                                <AmountInput
                                                    placeholder="0.00"
                                                    value={amountPaidGhs}
                                                    onChange={setAmountPaidGhs}
                                                    className={fieldClass}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
                                                Delivery notes
                                            </label>
                                            <textarea
                                                value={supplyNotes}
                                                onChange={(e) => setSupplyNotes(e.target.value)}
                                                rows={2}
                                                className={fieldClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="shrink-0 border-t border-[#eef0f2] bg-[#fafbfc] px-4 py-3 dark:border-white/[0.08] dark:bg-[#0c0c0c]">
                                    <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-5">
                                        <div className="flex justify-between gap-2 sm:block">
                                            <dt className="text-muted-foreground">Products</dt>
                                            <dd className="font-semibold tabular-nums">{summary.totalProducts}</dd>
                                        </div>
                                        <div className="flex justify-between gap-2 sm:block">
                                            <dt className="text-muted-foreground">Items</dt>
                                            <dd className="font-semibold tabular-nums">{summary.totalItems}</dd>
                                        </div>
                                        <div className="flex justify-between gap-2 sm:block">
                                            <dt className="text-muted-foreground">Cost</dt>
                                            <dd className="font-semibold tabular-nums">₵{summary.totalCost.toFixed(2)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-2 sm:block">
                                            <dt className="text-muted-foreground">Paid</dt>
                                            <dd className="font-semibold tabular-nums">₵{summary.totalPaid.toFixed(2)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-2 sm:col-span-1 sm:block">
                                            <dt className="text-muted-foreground">Balance</dt>
                                            <dd className="font-semibold tabular-nums">₵{summary.totalBalance.toFixed(2)}</dd>
                                        </div>
                                    </dl>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="inline-flex min-w-[7rem] flex-1 items-center justify-center rounded-xl bg-[#006c49] py-2.5 text-[14px] font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003523] sm:flex-none sm:px-8"
                                        >
                                            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handlePrintDraft}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-[13px] font-semibold hover:bg-muted/40 dark:border-white/[0.12]"
                                        >
                                            <Printer className="size-4" />
                                            Print
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownloadPdf}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#e5e7eb] px-4 py-2.5 text-[13px] font-semibold hover:bg-muted/40 dark:border-white/[0.12]"
                                        >
                                            <Download className="size-4" />
                                            Download
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </section>

                        <section
                            className={`${mobileTab === "history" ? "flex" : "hidden"} min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111] lg:flex`}
                        >
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#eef0f2] px-4 py-2.5 dark:border-white/[0.08]">
                                <h2 className="text-[14px] font-semibold">History</h2>
                                <span className="text-[12px] font-semibold tabular-nums text-muted-foreground">
                                    {supplies.length}
                                </span>
                            </div>
                            {!supplies.length ? (
                                <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-[13px] text-muted-foreground">
                                    None yet
                                </div>
                            ) : (
                                <div className="custom-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain">
                                    <table className="w-full min-w-[36rem] text-left text-[13px]">
                                        <thead className="sticky top-0 z-10 border-b bg-[#fafbfc] text-[11px] font-bold uppercase tracking-wider text-muted-foreground dark:bg-[#141414]">
                                            <tr>
                                                <th className="px-4 py-2.5">Date</th>
                                                <th className="px-3 py-2.5">Ref</th>
                                                <th className="px-3 py-2.5 text-right">Items</th>
                                                <th className="px-3 py-2.5 text-right">Cost</th>
                                                <th className="px-3 py-2.5 text-right">Paid</th>
                                                <th className="px-3 py-2.5">Payment</th>
                                                <th className="px-3 py-2.5">Status</th>
                                                <th className="px-3 py-2.5 text-right print:hidden"> </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#eef0f2] dark:divide-white/[0.06]">
                                            {supplies.map((o: Record<string, unknown>) => {
                                                const units = Number(
                                                    (o.totalUnitsSupplied as number | string | undefined) ?? 0,
                                                );
                                                const cost = Number(o.totalCostGhs ?? 0);
                                                const paid = Number(o.amountPaidGhs ?? 0);
                                                const status = String(o.paymentStatus ?? "");
                                                const pm = o.paymentMethod as string | undefined;
                                                const orderId = String(o.id ?? "");
                                                return (
                                                    <tr key={orderId} className="hover:bg-muted/30">
                                                        <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                                                            {o.orderedAt
                                                                ? new Date(String(o.orderedAt)).toLocaleDateString()
                                                                : "—"}
                                                        </td>
                                                        <td className="max-w-[10rem] truncate px-3 py-2.5 font-medium">
                                                            {String(o.reference ?? "")}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right tabular-nums">{units}</td>
                                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                                            ₵{cost.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right tabular-nums">
                                                            ₵{paid.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-muted-foreground">
                                                            {labelForPaymentMethod(pm)}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <span
                                                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${paymentStatusClass(status)}`}
                                                            >
                                                                {labelPaymentStatus(status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right print:hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => setPendingSupply(o)}
                                                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/40"
                                                                aria-label={`Delete supply ${String(o.reference ?? "")}`}
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>

            {/* Printable draft (browser print / Save as PDF) */}
            <div className="hidden print:block p-6 text-black">
                <h1 className="text-xl font-bold">Supply draft — {s.name}</h1>
                <p className="mt-1 text-sm">Reference: {reference || "—"}</p>
                <p className="text-sm">Printed: {new Date().toLocaleString()}</p>
                <table className="mt-4 w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="py-1 text-left">Product</th>
                            <th className="py-1 text-right">Qty</th>
                            <th className="py-1 text-right">Unit ₵</th>
                            <th className="py-1 text-right">Line ₵</th>
                        </tr>
                    </thead>
                    <tbody>
                        {validLines.map((l) => (
                            <tr key={l.id} className="border-b border-gray-200">
                                <td className="py-1">{l.productName}</td>
                                <td className="py-1 text-right">{lineQuantity(l)}</td>
                                <td className="py-1 text-right">{l.unitCostGhs.toFixed(2)}</td>
                                <td className="py-1 text-right">
                                    {(lineQuantity(l) * l.unitCostGhs).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mt-4 space-y-1 text-sm">
                    <p>Total cost: ₵{summary.totalCost.toFixed(2)}</p>
                    <p>Total paid: ₵{summary.totalPaid.toFixed(2)}</p>
                    <p>Balance: ₵{summary.totalBalance.toFixed(2)}</p>
                    <p>Payment method: {labelForPaymentMethod(paymentMethod)}</p>
                </div>
            </div>

            {pendingSupply ? (
                <DeleteConfirmModal
                    title="Delete this supply?"
                    description={
                        <>
                            Removing{" "}
                            <span className="font-semibold text-foreground">
                                &quot;{String(pendingSupply.reference ?? "this supply")}&quot;
                            </span>{" "}
                            will reverse the stock added from this delivery. This cannot be undone.
                        </>
                    }
                    isDeleting={deletingSupply}
                    onCancel={() => {
                        if (!deletingSupply) setPendingSupply(null);
                    }}
                    onConfirm={confirmDeleteSupply}
                />
            ) : null}

            {pendingDeleteSupplier ? (
                <DeleteConfirmModal
                    title="Delete this supplier?"
                    description={
                        <>
                            You will no longer take goods from{" "}
                            <span className="font-semibold text-foreground">&quot;{s.name}&quot;</span>.
                            Their supply records will be removed and stock from those deliveries will be
                            reversed. This cannot be undone.
                        </>
                    }
                    confirmLabel="Delete supplier"
                    isDeleting={deletingSupplier}
                    onCancel={() => {
                        if (!deletingSupplier) setPendingDeleteSupplier(false);
                    }}
                    onConfirm={confirmDeleteSupplier}
                />
            ) : null}
        </>
    );
}
