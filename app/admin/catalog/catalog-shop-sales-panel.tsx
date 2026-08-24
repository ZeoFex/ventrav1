"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Eye,
    Loader2,
    PackagePlus,
    Receipt,
    Search,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogShop } from "./catalog-admin-types";
import { authHeaders, formatDate } from "./catalog-admin-utils";
import {
    CatalogPagination,
    pageOffset,
    PRODUCT_PAGE_SIZE,
} from "./catalog-pagination";

type SaleRow = {
    id: string;
    invoiceId: string;
    totalGhs: string;
    paymentMethod: string;
    itemCount: number;
    status: string;
    createdAt: string;
    branchName?: string | null;
    customerName?: string | null;
    staffName?: string | null;
};

type SaleLine = {
    id: string;
    productId: string | null;
    variationId: string | null;
    productName: string;
    quantity: number;
    quantityReturned: number;
    unitPriceGhs: string;
    lineTotalGhs: string;
};

type SaleDetail = {
    sale: SaleRow & {
        subtotalGhs: string;
        taxGhs: string;
        discountGhs: string;
        amountPaidGhs?: string;
        balanceDueGhs?: string;
    };
    lines: SaleLine[];
    payments: { paymentMethod: string; amountGhs: string }[];
};

type Props = {
    token: string;
    shop: CatalogShop;
    /** When set, only sales tied to this saved customer are listed. */
    customerId?: string;
    customerName?: string;
    embedded?: boolean;
};

type DeleteMode = "free" | "restock";

function formatGhs(n: string | number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(Number(n));
}

export function CatalogShopSalesPanel({
    token,
    shop,
    customerId,
    customerName,
    embedded,
}: Props) {
    const [items, setItems] = useState<SaleRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const [viewSaleId, setViewSaleId] = useState<string | null>(null);
    const [detail, setDetail] = useState<SaleDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteIds, setDeleteIds] = useState<string[]>([]);
    const [deleteMode, setDeleteMode] = useState<DeleteMode>("restock");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const id = window.setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(0);
        }, 250);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                list: "1",
                limit: String(PRODUCT_PAGE_SIZE),
                offset: String(pageOffset(page, PRODUCT_PAGE_SIZE)),
            });
            if (searchQuery) params.set("q", searchQuery);
            if (customerId) params.set("customerId", customerId);
            const res = await fetch(`/api/platform/businesses/${shop.id}/sales?${params}`, {
                headers: authHeaders(token),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setItems(Array.isArray(data.items) ? data.items : []);
            setTotal(Number(data.total ?? 0));
            setSelected(new Set());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load sales");
        } finally {
            setLoading(false);
        }
    }, [shop.id, token, page, searchQuery, customerId]);

    useEffect(() => {
        void load();
    }, [load]);

    const loadDetail = useCallback(
        async (saleId: string) => {
            setDetailLoading(true);
            setError(null);
            try {
                const res = await fetch(
                    `/api/platform/businesses/${shop.id}/sales?saleId=${encodeURIComponent(saleId)}`,
                    { headers: authHeaders(token) },
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
                setDetail(data as SaleDetail);
            } catch (err) {
                setDetail(null);
                setError(err instanceof Error ? err.message : "Failed to load sale detail");
            } finally {
                setDetailLoading(false);
            }
        },
        [shop.id, token],
    );

    const openSale = (saleId: string) => {
        setViewSaleId(saleId);
        setDetail(null);
        setSuccess(null);
        void loadDetail(saleId);
    };

    const closeSale = () => {
        setViewSaleId(null);
        setDetail(null);
    };

    const allOnPageSelected =
        items.length > 0 && items.every((s) => selected.has(s.id));

    const toggleAll = () => {
        if (allOnPageSelected) {
            setSelected(new Set());
            return;
        }
        setSelected(new Set(items.map((s) => s.id)));
    };

    const toggleOne = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectedCount = selected.size;
    const selectedIds = useMemo(() => Array.from(selected), [selected]);

    const openDelete = (ids: string[]) => {
        if (ids.length === 0) return;
        setDeleteIds(ids);
        setDeleteMode("restock");
        setDeleteOpen(true);
        setSuccess(null);
        setError(null);
    };

    const confirmDelete = async () => {
        if (deleteIds.length === 0) return;
        setDeleting(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`/api/platform/businesses/${shop.id}/sales`, {
                method: "DELETE",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ids: deleteIds,
                    restock: deleteMode === "restock",
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

            const deleted = Number(data.deletedSales ?? deleteIds.length);
            const restored = Number(data.restockedUnits ?? 0);
            setSuccess(
                deleteMode === "restock"
                    ? `Deleted ${deleted} transaction(s) and restored ${restored} unit(s) to stock`
                    : `Deleted ${deleted} transaction(s) without restocking`,
            );
            setDeleteOpen(false);
            setDeleteIds([]);
            if (viewSaleId && deleteIds.includes(viewSaleId)) {
                closeSale();
            }
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        } finally {
            setDeleting(false);
        }
    };

    const viewingRow = items.find((s) => s.id === viewSaleId) ?? null;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {customerId ? "Customer transactions" : "Transaction history"}
                    </p>
                    <h3 className="mt-0.5 text-lg font-semibold text-foreground">
                        {customerId
                            ? customerName
                                ? `Sales for ${customerName}`
                                : "Sales for this customer"
                            : embedded
                              ? "Sales"
                              : "Browse & manage sales"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {total.toLocaleString()} sale{total === 1 ? "" : "s"}
                        {customerId ? " for this saved customer" : ""} · click a row to view sold
                        items
                    </p>
                    <div className="relative mt-3 max-w-md">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder={
                                customerId ? "Search invoice…" : "Search invoice or customer…"
                            }
                            className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                </div>
                <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting || selectedCount === 0}
                    onClick={() => openDelete(selectedIds)}
                >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Delete selected ({selectedCount})
                </Button>
            </div>

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {success}
                </p>
            ) : null}

            {deleteOpen ? (
                <DeleteConfirmCard
                    count={deleteIds.length}
                    deleteMode={deleteMode}
                    setDeleteMode={setDeleteMode}
                    deleting={deleting}
                    onConfirm={() => void confirmDelete()}
                    onCancel={() => {
                        setDeleteOpen(false);
                        setDeleteIds([]);
                    }}
                />
            ) : null}

            {viewSaleId ? (
                <SaleDetailPanel
                    invoiceHint={
                        detail?.sale.invoiceId ??
                        viewingRow?.invoiceId ??
                        "Transaction"
                    }
                    detail={detail}
                    loading={detailLoading}
                    onClose={closeSale}
                    onDelete={() => openDelete([viewSaleId])}
                    deleting={deleting}
                />
            ) : null}

            {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading transactions…
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
                    <Receipt className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    {customerId
                        ? "No transactions found for this saved customer."
                        : "No transactions found for this shop."}
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={allOnPageSelected}
                                    onChange={toggleAll}
                                    className="size-4 rounded border-input"
                                />
                                Select page
                            </label>
                            <span className="ml-auto font-normal normal-case tracking-normal">
                                Click a transaction to inspect items
                            </span>
                        </div>
                        <ul className="divide-y divide-border">
                            {items.map((sale) => {
                                const checked = selected.has(sale.id);
                                const active = viewSaleId === sale.id;
                                return (
                                    <li key={sale.id}>
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openSale(sale.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    openSale(sale.id);
                                                }
                                            }}
                                            className={cn(
                                                "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/50",
                                                checked && "bg-destructive/5",
                                                active && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onClick={(e) => toggleOne(sale.id, e)}
                                                onChange={() => {}}
                                                className="mt-1 size-4 shrink-0 rounded border-input"
                                                aria-label={`Select ${sale.invoiceId}`}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Eye className="size-3.5 text-muted-foreground" />
                                                    <span className="font-mono text-sm font-semibold text-foreground">
                                                        {sale.invoiceId}
                                                    </span>
                                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                                                        {sale.status.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 pl-5 text-xs text-muted-foreground">
                                                    {formatDate(sale.createdAt)} · {sale.itemCount}{" "}
                                                    item{sale.itemCount === 1 ? "" : "s"} ·{" "}
                                                    {sale.paymentMethod}
                                                    {sale.customerName
                                                        ? ` · ${sale.customerName}`
                                                        : " · Walk-in"}
                                                    {sale.staffName ? ` · ${sale.staffName}` : ""}
                                                    {sale.branchName
                                                        ? ` · ${sale.branchName}`
                                                        : ""}
                                                </p>
                                            </div>
                                            <span className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-foreground">
                                                {formatGhs(sale.totalGhs)}
                                            </span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <CatalogPagination
                        total={total}
                        page={page}
                        pageSize={PRODUCT_PAGE_SIZE}
                        onPageChange={setPage}
                        disabled={loading || deleting}
                    />
                </>
            )}
        </div>
    );
}

function SaleDetailPanel({
    invoiceHint,
    detail,
    loading,
    onClose,
    onDelete,
    deleting,
}: {
    invoiceHint: string;
    detail: SaleDetail | null;
    loading: boolean;
    onClose: () => void;
    onDelete: () => void;
    deleting: boolean;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-primary/30 bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Sale detail
                    </p>
                    <h4 className="font-mono text-base font-semibold text-foreground">
                        {invoiceHint}
                    </h4>
                    {detail?.sale ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(detail.sale.createdAt)} ·{" "}
                            {detail.sale.customerName || "Walk-in"}
                            {detail.sale.staffName ? ` · ${detail.sale.staffName}` : ""}
                        </p>
                    ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={deleting || loading || !detail}
                        onClick={onDelete}
                    >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete this sale
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={onClose}>
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Close
                    </Button>
                </div>
            </div>

            <div className="px-4 py-4">
                {loading && !detail ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading sold items…
                    </div>
                ) : detail ? (
                    <SaleDetailBody detail={detail} />
                ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Could not load this transaction.
                    </p>
                )}
            </div>
        </div>
    );
}

function DeleteConfirmCard({
    count,
    deleteMode,
    setDeleteMode,
    deleting,
    onConfirm,
    onCancel,
}: {
    count: number;
    deleteMode: DeleteMode;
    setDeleteMode: (m: DeleteMode) => void;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="space-y-4 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
            <div>
                <h4 className="text-base font-semibold text-foreground">
                    Delete {count} transaction{count === 1 ? "" : "s"}?
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                    Choose whether stock should go back onto the shelves.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setDeleteMode("restock")}
                    className={cn(
                        "rounded-xl border p-4 text-left transition",
                        deleteMode === "restock"
                            ? "border-emerald-500/50 bg-emerald-500/10 ring-2 ring-emerald-500/30"
                            : "border-border bg-card hover:bg-muted/40",
                    )}
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <PackagePlus className="h-4 w-4 text-emerald-600" />
                        Return goods to stock
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Restores remaining sold units (qty minus already returned) back to product
                        stock, then deletes. Example: 20 on hand, sell 4 → 16 left; after delete +
                        restock → back to 20.
                    </p>
                </button>
                <button
                    type="button"
                    onClick={() => setDeleteMode("free")}
                    className={cn(
                        "rounded-xl border p-4 text-left transition",
                        deleteMode === "free"
                            ? "border-destructive/50 bg-destructive/10 ring-2 ring-destructive/30"
                            : "border-border bg-card hover:bg-muted/40",
                    )}
                >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        Free deletion
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Removes the transactions from history only. Stock quantities stay as they
                        are (no restock).
                    </p>
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={onConfirm}
                >
                    {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                    {deleteMode === "restock"
                        ? "Delete & restore stock"
                        : "Delete without restock"}
                </Button>
                <Button type="button" variant="outline" disabled={deleting} onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </div>
    );
}

function SaleDetailBody({ detail }: { detail: SaleDetail }) {
    const { sale, lines, payments } = detail;
    return (
        <div className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-3">
                <Meta label="Customer" value={sale.customerName || "Walk-in"} />
                <Meta label="Cashier" value={sale.staffName || "—"} />
                <Meta label="Branch" value={sale.branchName || "—"} />
            </div>

            <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Items sold ({lines.length})
                </p>
                {lines.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-muted-foreground">
                        No line items on this sale.
                    </p>
                ) : (
                    <div className="overflow-hidden rounded-lg border border-border bg-background">
                        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <span>Item</span>
                            <span className="text-right">Qty</span>
                            <span className="text-right">Returned</span>
                            <span className="text-right">Unit</span>
                            <span className="text-right">Total</span>
                        </div>
                        <ul className="divide-y divide-border">
                            {lines.map((line) => {
                                const restorable = Math.max(
                                    0,
                                    line.quantity - line.quantityReturned,
                                );
                                return (
                                    <li
                                        key={line.id}
                                        className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2.5"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">
                                                {line.productName}
                                            </p>
                                            {restorable > 0 ? (
                                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                                    {restorable} unit
                                                    {restorable === 1 ? "" : "s"} restorable to
                                                    stock
                                                </p>
                                            ) : (
                                                <p className="text-[11px] text-muted-foreground">
                                                    Fully returned already
                                                </p>
                                            )}
                                        </div>
                                        <span className="tabular-nums text-muted-foreground">
                                            {line.quantity}
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">
                                            {line.quantityReturned}
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">
                                            {formatGhs(line.unitPriceGhs)}
                                        </span>
                                        <span className="tabular-nums font-semibold text-foreground">
                                            {formatGhs(line.lineTotalGhs)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

            <div className="grid gap-1 text-xs sm:ml-auto sm:max-w-xs">
                <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatGhs(sale.subtotalGhs)}</span>
                </div>
                <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="tabular-nums">{formatGhs(sale.taxGhs)}</span>
                </div>
                <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="tabular-nums">−{formatGhs(sale.discountGhs)}</span>
                </div>
                <div className="flex justify-between gap-6 border-t border-border pt-1 text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatGhs(sale.totalGhs)}</span>
                </div>
                {payments.length > 0 ? (
                    <div className="mt-2 space-y-0.5 border-t border-border pt-2">
                        {payments.map((p, i) => (
                            <div
                                key={i}
                                className="flex justify-between gap-6 text-muted-foreground"
                            >
                                <span>{p.paymentMethod}</span>
                                <span className="tabular-nums">{formatGhs(p.amountGhs)}</span>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-border bg-background px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-0.5 truncate font-medium text-foreground">{value}</p>
        </div>
    );
}
