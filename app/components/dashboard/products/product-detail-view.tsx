"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Loader2, Package, PackagePlus, Pencil, Printer, Trash2, Users } from "lucide-react";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity } from "@/app/lib/product-units";
import { useBranchContext } from "../branch-context";
import { CatalogProductImage } from "./catalog-product-image";
import { ProductStatsCharts } from "./product-stats-charts";
import { StockAdjustModal } from "./stock-adjust-modal";
import { DeleteConfirmModal } from "../suppliers/delete-confirm-modal";
import { buildReceiptDataFromCompletedSale } from "../pos/sale/pos-receipt-data";
import { printReceiptHtml } from "../pos/sale/pos-print-utils";

const fetcher = (url: string) =>
    fetch(url).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

function money(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function qty(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
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

function statusLabel(status: string): string {
    if (status === "completed") return "Done";
    if (status === "partially_refunded") return "Partial";
    if (status === "refunded") return "Returned";
    if (status === "voided") return "Void";
    return status.replace(/_/g, " ");
}

type Tab = "sales" | "buyers" | "stats";

type Metrics = {
    qtySold: number;
    revenue: number;
    profit: number;
};

type ReceiptRow = {
    id: string;
    invoiceId: string;
    createdAt: string;
    status: string;
    quantity: number;
    unitPriceGhs: number;
    lineTotalGhs: number;
    customerName: string | null;
};

type BuyerRow = {
    customerId: string | null;
    customerName: string | null;
    salesCount: number;
    quantity: number;
    spentGhs: number;
};

type VariationRow = {
    id: string;
    name: string;
    type: string;
    sku: string | null;
    barcode: string | null;
    priceGhs: number | null;
    stock: number;
    stockReserved: number;
    stockAvailable: number;
};

export function ProductDetailView({ productId }: { productId: string }) {
    const router = useRouter();
    const { branchId } = useBranchContext();
    const { data, isLoading, error, mutate } = useSWR(
        productId ? `/api/products/${productId}/profile?b=${branchId}` : null,
        () => fetcher(`/api/products/${productId}/profile`),
    );
    const [tab, setTab] = useState<Tab>("stats");
    const [printingId, setPrintingId] = useState<string | null>(null);
    const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);
    const [adjustingStock, setAdjustingStock] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [receiptLines, setReceiptLines] = useState<
        Record<string, { productName: string; quantity: number; unitPriceGhs?: string; lineTotalGhs: string }[]>
    >({});

    async function loadLines(saleId: string) {
        if (receiptLines[saleId]) {
            setOpenReceiptId((cur) => (cur === saleId ? null : saleId));
            return;
        }
        try {
            const res = await fetch(`/api/products/${productId}/sales/${saleId}`);
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
            const res = await fetch(`/api/products/${productId}/sales/${saleId}`);
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

    async function deleteProduct() {
        if (deleting) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/products?id=${productId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            toast.success("Product deleted");
            router.push("/dashboard/products");
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Could not delete");
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-full min-h-0 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data?.product) {
        return (
            <div className="flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
                <p className="text-destructive">Could not load this product.</p>
                <Link
                    href="/dashboard/products"
                    className="mt-3 text-[14px] font-semibold text-[#006c49] underline dark:text-[#6ffbbe]"
                >
                    Back to products
                </Link>
            </div>
        );
    }

    const p = data.product as {
        name: string;
        sku: string;
        barcode: string | null;
        imageSrc: string | null;
        stock: number;
        stockOnHand?: number;
        stockReserved?: number;
        stockAvailable?: number;
        costPriceGhs: number;
        sellingPriceGhs: number;
        priceGhs?: number;
        unit?: string | null;
        description?: string | null;
        reorderAt?: number | null;
        categoryName?: string | null;
        subcategoryName?: string | null;
        createdAt: string;
    };
    const unit = p.unit ?? "piece";
    const price = money(p.sellingPriceGhs ?? p.priceGhs);
    const stock = qty(p.stock);
    const overall = (data.overall ?? { qtySold: 0, revenue: 0, profit: 0 }) as Metrics;
    const daily = (data.daily ?? { qtySold: 0, revenue: 0, profit: 0 }) as Metrics;
    const weekly = (data.weekly ?? { qtySold: 0, revenue: 0, profit: 0 }) as Metrics;
    const monthly = (data.monthly ?? { qtySold: 0, revenue: 0, profit: 0 }) as Metrics;
    const salesCount = qty(data.salesCount);
    const lastSoldAt = (data.lastSoldAt ?? null) as string | null;
    const receipts = (data.receipts ?? []) as ReceiptRow[];
    const buyers = (data.buyers ?? []) as BuyerRow[];
    const variations = (data.variations ?? []) as VariationRow[];
    const categoryLabel = [p.categoryName, p.subcategoryName].filter(Boolean).join(" · ");

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-3 px-3 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:gap-4 lg:px-6 lg:pb-4">
                <header className="flex shrink-0 items-center gap-3">
                    <Link
                        href="/dashboard/products"
                        className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        aria-label="Back to products"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                        {p.imageSrc ? (
                            <CatalogProductImage
                                src={p.imageSrc}
                                alt={p.name}
                                className="absolute inset-0 size-full object-cover"
                            />
                        ) : (
                            <span className="flex size-full items-center justify-center text-[11px] font-bold uppercase opacity-40">
                                {p.name[0]}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-tight">
                            {p.name}
                        </h1>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                            {[p.sku, p.barcode, categoryLabel].filter(Boolean).join(" · ")}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {branchId !== "all" ? (
                            <button
                                type="button"
                                onClick={() => setAdjustingStock(true)}
                                className="inline-flex size-9 items-center justify-center rounded-xl border border-border hover:bg-muted/50"
                                aria-label="Adjust stock"
                            >
                                <PackagePlus className="size-3.5" />
                            </button>
                        ) : null}
                        <Link
                            href={`/dashboard/products/${productId}/edit`}
                            className="inline-flex size-9 items-center justify-center rounded-xl border border-border hover:bg-muted/50"
                            aria-label="Edit product"
                        >
                            <Pencil className="size-3.5" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setConfirmDelete(true)}
                            className="inline-flex size-9 items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/40"
                            aria-label="Delete product"
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                </header>

                <section className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Price" value={formatGhs(price)} accent />
                    <Stat label="Stock" value={formatQuantity(stock, unit, { showPieces: true })} />
                    <Stat label="Sales" value={String(salesCount)} />
                    <Stat label="Revenue" value={formatGhs(money(overall.revenue))} />
                </section>

                <div className="grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
                    {(
                        [
                            ["sales", "Sales"],
                            ["buyers", "Buyers"],
                            ["stats", "Stats"],
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
                    {tab === "sales" ? (
                        <div className="custom-scrollbar flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain">
                            {!receipts.length ? (
                                <p className="p-6 text-[13px] text-muted-foreground">No sales yet.</p>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {receipts.map((r) => {
                                        const open = openReceiptId === r.id;
                                        const lines = receiptLines[r.id] ?? [];
                                        return (
                                            <li key={`${r.id}-${r.createdAt}`} className="px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => loadLines(r.id)}
                                                        className="min-w-0 flex-1 text-left"
                                                    >
                                                        <p className="flex items-center gap-1.5 truncate text-[14px] font-semibold">
                                                            <ChevronDown
                                                                className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${
                                                                    open ? "rotate-180" : "-rotate-90"
                                                                }`}
                                                            />
                                                            {r.invoiceId}
                                                        </p>
                                                        <p className="pl-5 text-[12px] text-muted-foreground">
                                                            {formatWhen(r.createdAt)}
                                                            {r.customerName ? ` · ${r.customerName}` : " · Walk-in"}
                                                            {" · "}
                                                            {formatQuantity(qty(r.quantity), unit, { showPieces: true })}
                                                            {" @ "}
                                                            {formatGhs(money(r.unitPriceGhs))}
                                                        </p>
                                                    </button>
                                                    <div className="text-right">
                                                        <p className="text-[14px] font-semibold tabular-nums">
                                                            {formatGhs(money(r.lineTotalGhs))}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {statusLabel(r.status)}
                                                        </p>
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
                                                                        <span className="text-muted-foreground">
                                                                            ×{l.quantity}
                                                                            {l.unitPriceGhs
                                                                                ? ` @ ${formatGhs(money(l.unitPriceGhs))}`
                                                                                : ""}
                                                                        </span>
                                                                    </span>
                                                                    <span className="tabular-nums">
                                                                        {formatGhs(money(l.lineTotalGhs))}
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

                    {tab === "buyers" ? (
                        <div className="custom-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain">
                            {!buyers.length ? (
                                <p className="p-6 text-[13px] text-muted-foreground">No named buyers yet.</p>
                            ) : (
                                <table className="w-full text-left text-[13px]">
                                    <thead className="sticky top-0 border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-2.5">Customer</th>
                                            <th className="px-3 py-2.5 text-right">Sales</th>
                                            <th className="px-3 py-2.5 text-right">Qty</th>
                                            <th className="px-4 py-2.5 text-right">Spent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {buyers.map((b, i) => (
                                            <tr key={`${b.customerId ?? b.customerName}-${i}`}>
                                                <td className="px-4 py-2.5 font-medium">
                                                    <span className="inline-flex items-center gap-2">
                                                        <Users className="size-3.5 text-muted-foreground" />
                                                        {b.customerId ? (
                                                            <Link
                                                                href={`/dashboard/customers/${b.customerId}`}
                                                                className="hover:underline"
                                                            >
                                                                {b.customerName ?? "Customer"}
                                                            </Link>
                                                        ) : (
                                                            b.customerName ?? "Walk-in"
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">{b.salesCount}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums">
                                                    {formatQuantity(qty(b.quantity), unit, { showPieces: true })}
                                                </td>
                                                <td className="px-4 py-2.5 text-right tabular-nums">
                                                    {formatGhs(money(b.spentGhs))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : null}

                    {tab === "stats" ? (
                        <div className="custom-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain p-4">
                            <ProductStatsCharts
                                daily={daily}
                                weekly={weekly}
                                monthly={monthly}
                                overall={overall}
                                stock={stock}
                                buyers={buyers}
                            />

                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                <InfoCell label="Price" value={formatGhs(price)} accent />
                                <InfoCell
                                    label="Stock"
                                    value={formatQuantity(stock, unit, { showPieces: true })}
                                />
                                <InfoCell label="Cost" value={formatGhs(money(p.costPriceGhs))} />
                                <InfoCell
                                    label="Available"
                                    value={formatQuantity(qty(p.stockAvailable ?? stock), unit, {
                                        showPieces: true,
                                    })}
                                />
                                <InfoCell
                                    label="Reserved"
                                    value={formatQuantity(qty(p.stockReserved), unit, { showPieces: true })}
                                />
                                <InfoCell
                                    label="Reorder at"
                                    value={formatQuantity(qty(p.reorderAt ?? 5), unit, { showPieces: true })}
                                />
                            </div>

                            {variations.length ? (
                                <div className="mt-4 overflow-hidden rounded-xl border border-border">
                                    <p className="border-b border-border bg-muted/40 px-3 py-2 text-[12px] font-semibold">
                                        Variations
                                    </p>
                                    <table className="w-full text-left text-[13px]">
                                        <thead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2">Name</th>
                                                <th className="px-3 py-2 text-right">Price</th>
                                                <th className="px-3 py-2 text-right">Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {variations.map((v) => (
                                                <tr key={v.id}>
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium">{v.name}</p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {[v.type, v.sku].filter(Boolean).join(" · ")}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">
                                                        {formatGhs(money(v.priceGhs ?? price))}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">
                                                        {formatQuantity(qty(v.stock), unit, { showPieces: true })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}

                            {p.description ? (
                                <p className="mt-4 text-[13px] text-muted-foreground">{p.description}</p>
                            ) : null}
                            <p className="mt-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                <Package className="size-3.5" />
                                Added {new Date(p.createdAt).toLocaleDateString("en-GH")}
                                {lastSoldAt ? ` · Last sold ${formatWhen(lastSoldAt)}` : ""}
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
            <StockAdjustModal
                product={
                    adjustingStock
                        ? {
                              id: productId,
                              name: p.name,
                              stock: qty(p.stockOnHand ?? p.stock),
                              priceGhs: price,
                              costPriceGhs: p.costPriceGhs,
                              unit: p.unit,
                          }
                        : null
                }
                onClose={() => setAdjustingStock(false)}
                onSaved={() => {
                    mutate();
                    toast.success("Stock updated");
                }}
            />
            {confirmDelete ? (
                <DeleteConfirmModal
                    title="Delete product"
                    description={
                        <>
                            Delete <span className="font-semibold text-foreground">{p.name}</span> from the catalog?
                        </>
                    }
                    isDeleting={deleting}
                    onCancel={() => setConfirmDelete(false)}
                    onConfirm={deleteProduct}
                />
            ) : null}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-xl border border-border bg-surface-card px-3 py-2 dark:bg-[#111]">
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
            <p
                className={`mt-0.5 truncate text-[13px] font-semibold tabular-nums sm:text-[14px] ${
                    accent ? "text-[#006c49] dark:text-[#6ffbbe]" : ""
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function InfoCell({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div className="rounded-xl border border-border px-3 py-2.5">
            <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
            <p
                className={`mt-0.5 text-[14px] font-semibold tabular-nums ${
                    accent ? "text-[#006c49] dark:text-[#6ffbbe]" : ""
                }`}
            >
                {value}
            </p>
        </div>
    );
}

