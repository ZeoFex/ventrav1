"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogShop } from "./catalog-admin-types";
import { authHeaders, formatDate } from "./catalog-admin-utils";
import {
    CatalogPagination,
    pageOffset,
    PRODUCT_PAGE_SIZE,
} from "./catalog-pagination";
import { CatalogShopSalesPanel } from "./catalog-shop-sales-panel";

type CustomerRow = {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    status: string;
    accountsReceivableGhs: string;
    createdAt: string;
    saleCount: number;
    spentGhs: string;
    lastSaleAt: string | null;
};

type Props = {
    token: string;
    shop: CatalogShop;
};

function formatGhs(n: string | number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(Number(n));
}

export function CatalogShopCustomersPanel({ token, shop }: Props) {
    const [items, setItems] = useState<CustomerRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<CustomerRow | null>(null);

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
            const res = await fetch(
                `/api/platform/businesses/${shop.id}/customers?${params}`,
                { headers: authHeaders(token) },
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setItems(Array.isArray(data.items) ? data.items : []);
            setTotal(Number(data.total ?? 0));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load customers");
        } finally {
            setLoading(false);
        }
    }, [shop.id, token, page, searchQuery]);

    useEffect(() => {
        if (selected) return;
        void load();
    }, [load, selected]);

    if (selected) {
        return (
            <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Saved customer
                        </p>
                        <h3 className="mt-0.5 truncate text-lg font-semibold text-foreground">
                            {selected.name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {selected.phone}
                            {selected.email ? ` · ${selected.email}` : ""} ·{" "}
                            {selected.saleCount.toLocaleString()} sale
                            {selected.saleCount === 1 ? "" : "s"} · {formatGhs(selected.spentGhs)}{" "}
                            spent
                            {Number(selected.accountsReceivableGhs) > 0
                                ? ` · ${formatGhs(selected.accountsReceivableGhs)} owed`
                                : ""}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setSelected(null);
                            void load();
                        }}
                    >
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        All customers
                    </Button>
                </div>
                <CatalogShopSalesPanel
                    key={selected.id}
                    token={token}
                    shop={shop}
                    customerId={selected.id}
                    customerName={selected.name}
                    embedded
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Saved customers
                </p>
                <h3 className="mt-0.5 text-lg font-semibold text-foreground">
                    Customers for this shop
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {total.toLocaleString()} saved customer{total === 1 ? "" : "s"} · open one to
                    view and manage their transactions
                </p>
                <div className="relative mt-3 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search name, phone, or email…"
                        className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            </div>

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading customers…
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No saved customers found for this shop.
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <ul className="divide-y divide-border">
                            {items.map((customer) => (
                                <li key={customer.id}>
                                    <button
                                        type="button"
                                        onClick={() => setSelected(customer)}
                                        className={cn(
                                            "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/50",
                                        )}
                                    >
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                                            {customer.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate font-semibold text-foreground">
                                                    {customer.name}
                                                </span>
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                                                    {customer.status}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {customer.phone}
                                                {customer.email ? ` · ${customer.email}` : ""} ·{" "}
                                                {customer.saleCount.toLocaleString()} sale
                                                {customer.saleCount === 1 ? "" : "s"}
                                                {customer.lastSaleAt
                                                    ? ` · last ${formatDate(customer.lastSaleAt)}`
                                                    : ""}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-semibold tabular-nums text-foreground">
                                                {formatGhs(customer.spentGhs)}
                                            </p>
                                            {Number(customer.accountsReceivableGhs) > 0 ? (
                                                <p className="text-[11px] tabular-nums text-amber-700 dark:text-amber-400">
                                                    {formatGhs(customer.accountsReceivableGhs)} owed
                                                </p>
                                            ) : null}
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <CatalogPagination
                        total={total}
                        page={page}
                        pageSize={PRODUCT_PAGE_SIZE}
                        onPageChange={setPage}
                        disabled={loading}
                    />
                </>
            )}
        </div>
    );
}
