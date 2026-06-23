"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useEffect, type FormEvent } from "react";
import useSWR from "swr";
import {
    ArrowLeft,
    Download,
    History,
    Loader2,
    Pencil,
    Plus,
    Printer,
    Trash2,
    Truck,
} from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useProducts, useCategories } from "../products/products-data-hooks";
import type { Product } from "@/app/lib/offline/offline-db";
import { toast } from "sonner";

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
        const paid = Math.max(0, parseFloat(amountPaidGhs) || 0);
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

    function handlePrintDraft() {
        window.print();
    }

    function handleDownloadPdf() {
        toast.message("PDF download will be available in a future update. Use Print and save as PDF for now.");
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data?.supplier) {
        return (
            <div className="p-8 text-center text-destructive">
                Could not load supplier.{" "}
                <Link href="/dashboard/suppliers" className="underline">
                    Back to supplier list
                </Link>
            </div>
        );
    }

    const s = data.supplier;
    const outstanding = Number(data.outstandingGhs ?? 0);
    const supplies = data.supplies ?? [];
    const phoneStr = (s.phones ?? []).map((p: { phone: string }) => p.phone).join(", ");

    return (
        <>
            <div className="print:hidden">
                <ProductsPageShell
                    title={s.name}
                    description="Supplier profile, supply records, and new stock deliveries (GRN)."
                    actions={
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={`/dashboard/suppliers/${supplierId}/edit`}
                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px] font-medium"
                            >
                                <Pencil className="size-4" />
                                Edit details
                            </Link>
                            <Link
                                href="/dashboard/suppliers"
                                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[14px]"
                            >
                                <ArrowLeft className="size-4" />
                                Supplier list
                            </Link>
                        </div>
                    }
                >
                    {/* Supplier profile */}
                    <section className="mb-8 rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]">
                        <div className="flex flex-wrap items-start gap-4">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                                <Truck className="size-6" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[15px] font-semibold">Supplier profile</h2>
                                <p className="mt-1 text-[13px] text-muted-foreground">
                                    {s.type === "business" ? "Business" : "Individual"}
                                    {s.truckNumber ? ` · Truck ${s.truckNumber}` : ""}
                                    {s.email ? ` · ${s.email}` : ""}
                                </p>
                                {phoneStr ? (
                                    <p className="mt-2 text-[14px] text-foreground">Phones: {phoneStr}</p>
                                ) : null}
                                <div className="mt-4 flex flex-wrap gap-3 text-[14px]">
                                    <div className="rounded-xl bg-muted/50 px-4 py-2">
                                        <span className="text-muted-foreground">Outstanding balance</span>
                                        <p className="text-lg font-semibold tabular-nums">₵{outstanding.toFixed(2)}</p>
                                    </div>
                                    <Link
                                        href="#supply-history"
                                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-medium hover:bg-muted/40"
                                    >
                                        <History className="size-4" />
                                        View history
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-8 lg:grid-cols-2">
                        <section className="rounded-2xl border border-[#eef0f2] p-5 dark:border-white/[0.08]">
                            <h2 className="text-[15px] font-semibold">Add new supply</h2>
                            <p className="mt-1 text-[13px] text-muted-foreground">
                                Match catalog products to increase stock. Category is optional and can be adjusted per
                                line.
                            </p>
                            <form onSubmit={handleRecordSupply} className="mt-4 space-y-4">
                                <div>
                                    <label className="mb-1 block text-[13px] font-medium">Reference</label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            value={reference}
                                            onChange={(e) => {
                                                setReferenceTouched(true);
                                                setReference(e.target.value);
                                            }}
                                            placeholder="Invoice # / waybill"
                                            className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReference(generateGrnReference());
                                                setReferenceTouched(false);
                                            }}
                                            className="shrink-0 rounded-xl border px-3 py-2 text-[12px] font-semibold hover:bg-muted/40"
                                        >
                                            New #
                                        </button>
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Auto-generated when you open this form — edit if needed.
                                    </p>
                                </div>

                                <div className="space-y-3 rounded-xl border border-dashed p-4 dark:border-white/[0.12]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] font-medium">Product lines</span>
                                        <button
                                            type="button"
                                            onClick={() => setLines((p) => [...p, newLine()])}
                                            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
                                        >
                                            <Plus className="size-4" /> Add row
                                        </button>
                                    </div>
                                    {lines.map((line) => {
                                        const qty = lineQuantity(line);
                                        const lineTotal =
                                            Math.round(qty * Math.max(0, line.unitCostGhs) * 100) / 100;
                                        return (
                                            <div
                                                key={line.id}
                                                className="space-y-2 rounded-xl border bg-muted/20 p-3 dark:border-white/[0.08]"
                                            >
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setLines((p) =>
                                                                p.length <= 1 ? p : p.filter((x) => x.id !== line.id),
                                                            )
                                                        }
                                                        className="text-muted-foreground hover:text-destructive"
                                                        aria-label="Remove line"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[12px] text-muted-foreground">
                                                        Catalog product (optional)
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
                                                        className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                    >
                                                        <option value="">— Type name manually below —</option>
                                                        {(products as Product[]).map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[12px] text-muted-foreground">
                                                        Product name
                                                    </label>
                                                    <input
                                                        value={line.productName}
                                                        onChange={(e) =>
                                                            updateLine(line.id, { productName: e.target.value })
                                                        }
                                                        className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[12px] text-muted-foreground">
                                                        Category
                                                    </label>
                                                    <select
                                                        value={line.categoryName ?? ""}
                                                        onChange={(e) =>
                                                            updateLine(line.id, {
                                                                categoryName: e.target.value || null,
                                                            })
                                                        }
                                                        className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                    >
                                                        <option value="">— Select category —</option>
                                                        {(categories as { id: string; name: string }[]).map((c) => (
                                                            <option key={c.id} value={c.name}>
                                                                {c.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {!line.productId && line.productName.trim() ? (
                                                    <Link
                                                        href={`/dashboard/products/new?name=${encodeURIComponent(line.productName.trim())}`}
                                                        className="inline-flex text-[12px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
                                                    >
                                                        Add &quot;{line.productName.trim()}&quot; to catalog →
                                                    </Link>
                                                ) : null}
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                    <div>
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
                                                            Cartons
                                                        </label>
                                                        <select
                                                            value={
                                                                CARTON_PRESETS.includes(line.cartons as (typeof CARTON_PRESETS)[number])
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
                                                            className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                        >
                                                            {CARTON_PRESETS.map((n) => (
                                                                <option key={n} value={n}>
                                                                    {n} carton{n === 1 ? "" : "s"}
                                                                </option>
                                                            ))}
                                                            <option value="custom">Custom…</option>
                                                        </select>
                                                        {!CARTON_PRESETS.includes(line.cartons as (typeof CARTON_PRESETS)[number]) ? (
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
                                                                className="mt-1 w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                            />
                                                        ) : null}
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
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
                                                            className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
                                                            Total items (auto or override)
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
                                                                const n = Number.isNaN(raw)
                                                                    ? def
                                                                    : Math.max(1, raw);
                                                                updateLine(line.id, {
                                                                    manualTotalItems: n === def ? null : n,
                                                                });
                                                            }}
                                                            className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
                                                            Cost per item ₵
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            value={line.unitCostGhs}
                                                            onChange={(e) =>
                                                                updateLine(line.id, {
                                                                    unitCostGhs: Math.max(
                                                                        0,
                                                                        parseFloat(e.target.value) || 0,
                                                                    ),
                                                                })
                                                            }
                                                            className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
                                                            Line total ₵
                                                        </label>
                                                        <p className="rounded-lg border border-transparent bg-background px-2 py-2 text-[13px] font-medium tabular-nums">
                                                            {lineTotal.toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
                                                            Batch no (optional)
                                                        </label>
                                                        <input
                                                            value={line.batchNo}
                                                            onChange={(e) =>
                                                                updateLine(line.id, { batchNo: e.target.value })
                                                            }
                                                            className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1 block text-[12px] text-muted-foreground">
                                                            Expiry (optional)
                                                        </label>
                                                        <input
                                                            type="date"
                                                            value={line.expiryDate}
                                                            onChange={(e) =>
                                                                updateLine(line.id, { expiryDate: e.target.value })
                                                            }
                                                            className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-[12px] text-muted-foreground">
                                                        Line notes (optional)
                                                    </label>
                                                    <input
                                                        value={line.lineNotes}
                                                        onChange={(e) =>
                                                            updateLine(line.id, { lineNotes: e.target.value })
                                                        }
                                                        className="w-full rounded-lg border px-2 py-2 text-[13px] dark:border-white/[0.12] dark:bg-[#111]"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-[13px] font-medium">Payment method</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                                        >
                                            {SUPPLY_PAYMENT_METHODS.map((m) => (
                                                <option key={m.value} value={m.value}>
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[13px] font-medium">Amount paid (₵)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            value={amountPaidGhs}
                                            onChange={(e) => setAmountPaidGhs(e.target.value)}
                                            className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[13px] font-medium">Delivery notes (optional)</label>
                                    <textarea
                                        value={supplyNotes}
                                        onChange={(e) => setSupplyNotes(e.target.value)}
                                        rows={2}
                                        className="w-full rounded-xl border px-3 py-2 dark:border-white/[0.12] dark:bg-[#111]"
                                    />
                                </div>

                                <div className="rounded-xl border bg-muted/30 p-4 dark:border-white/[0.08]">
                                    <h3 className="text-[13px] font-semibold">Summary</h3>
                                    <dl className="mt-3 grid gap-2 text-[14px] sm:grid-cols-2">
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-muted-foreground">Total products</dt>
                                            <dd className="font-medium tabular-nums">{summary.totalProducts}</dd>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-muted-foreground">Total items</dt>
                                            <dd className="font-medium tabular-nums">{summary.totalItems}</dd>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-muted-foreground">Total cost</dt>
                                            <dd className="font-medium tabular-nums">₵{summary.totalCost.toFixed(2)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-4">
                                            <dt className="text-muted-foreground">Total paid</dt>
                                            <dd className="font-medium tabular-nums">₵{summary.totalPaid.toFixed(2)}</dd>
                                        </div>
                                        <div className="flex justify-between gap-4 sm:col-span-2">
                                            <dt className="text-muted-foreground">Balance</dt>
                                            <dd className="font-semibold tabular-nums">₵{summary.totalBalance.toFixed(2)}</dd>
                                        </div>
                                    </dl>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 rounded-xl bg-[#006c49] py-3 font-semibold text-white disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003523] sm:flex-none sm:px-8"
                                    >
                                        {submitting ? (
                                            <Loader2 className="mx-auto size-5 animate-spin" />
                                        ) : (
                                            "Save"
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePrintDraft}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[14px] font-medium sm:flex-none sm:px-5"
                                    >
                                        <Printer className="size-4" />
                                        Print
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownloadPdf}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-[14px] font-medium sm:flex-none sm:px-5"
                                    >
                                        <Download className="size-4" />
                                        Download
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section id="supply-history">
                            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
                                <History className="size-4" />
                                Supply records (history)
                            </h2>
                            {!supplies.length ? (
                                <p className="mt-3 text-[14px] text-muted-foreground">No supplies recorded yet.</p>
                            ) : (
                                <div className="mt-3 overflow-x-auto rounded-2xl border text-[13px] dark:border-white/[0.08]">
                                    <table className="w-full min-w-[36rem] text-left">
                                        <thead className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Ref</th>
                                                <th className="px-3 py-2 text-right">Items supplied</th>
                                                <th className="px-3 py-2 text-right">Total cost</th>
                                                <th className="px-3 py-2 text-right">Amount paid</th>
                                                <th className="px-3 py-2">Payment</th>
                                                <th className="px-3 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {supplies.map((o: Record<string, unknown>) => {
                                                const units = Number(
                                                    (o.totalUnitsSupplied as number | string | undefined) ?? 0);
                                                const cost = Number(o.totalCostGhs ?? 0);
                                                const paid = Number(o.amountPaidGhs ?? 0);
                                                const status = String(o.paymentStatus ?? "");
                                                const pm = o.paymentMethod as string | undefined;
                                                return (
                                                    <tr key={String(o.id)}>
                                                        <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                                            {o.orderedAt
                                                                ? new Date(String(o.orderedAt)).toLocaleDateString()
                                                                : "—"}
                                                        </td>
                                                        <td className="max-w-[10rem] truncate px-3 py-2 font-medium">
                                                            {String(o.reference ?? "")}
                                                        </td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{units}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">
                                                            ₵{cost.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right tabular-nums">
                                                            ₵{paid.toFixed(2)}
                                                        </td>
                                                        <td className="px-3 py-2 text-muted-foreground">
                                                            {labelForPaymentMethod(pm)}
                                                        </td>
                                                        <td className="px-3 py-2">{labelPaymentStatus(status)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </div>
                </ProductsPageShell>
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
        </>
    );
}
