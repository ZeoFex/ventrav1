"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ArrowLeft,
    ChevronRight,
    Loader2,
    MapPin,
    Package,
    Search,
    Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    CatalogProductThumb,
} from "./catalog-product-display";
import type { CatalogShop, ShopProduct } from "./catalog-admin-types";
import { shopTypeIcon } from "./catalog-admin-types";

function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

export function CatalogShopsPanel({ token }: { token: string }) {
    const [shopSearch, setShopSearch] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [selectedShop, setSelectedShop] = useState<CatalogShop | null>(null);
    const [shops, setShops] = useState<CatalogShop[]>([]);
    const [shopTotal, setShopTotal] = useState(0);
    const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
    const [productTotal, setProductTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apiGet = useCallback(
        async <T,>(path: string): Promise<T> => {
            const res = await fetch(path, { headers: authHeaders(token) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            return data as T;
        },
        [token]
    );

    const loadShops = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ limit: "500", offset: "0" });
            if (shopSearch.trim()) params.set("q", shopSearch.trim());
            const data = await apiGet<{ items: CatalogShop[]; total: number }>(
                `/api/platform/master-catalog/shops?${params}`
            );
            setShops(data.items);
            setShopTotal(data.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load shops");
        } finally {
            setLoading(false);
        }
    }, [apiGet, shopSearch]);

    const fetchProducts = useCallback(
        async (query: string) => {
            if (!selectedShop) return;
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    limit: "500",
                    offset: "0",
                    sort: "name",
                    order: "asc",
                });
                if (query.trim()) params.set("q", query.trim());
                const data = await apiGet<{
                    items: ShopProduct[];
                    total: number;
                    shop: CatalogShop;
                }>(
                    `/api/platform/master-catalog/shops/${selectedShop.id}/products?${params}`
                );
                setShopProducts(data.items);
                setProductTotal(data.total);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to load products"
                );
            } finally {
                setLoading(false);
            }
        },
        [apiGet, selectedShop]
    );

    useEffect(() => {
        if (selectedShop) return;
        void loadShops();
    }, [loadShops, selectedShop]);

    useEffect(() => {
        if (!selectedShop) return;
        void fetchProducts("");
    }, [selectedShop?.id, fetchProducts]);

    const openShop = (shop: CatalogShop) => {
        setProductSearch("");
        setSelectedShop(shop);
    };

    const backToShops = () => {
        setSelectedShop(null);
        setShopProducts([]);
        setProductTotal(0);
    };

    if (selectedShop) {
        const ShopIcon = shopTypeIcon(selectedShop.shopType);
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={backToShops}>
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        All shops
                    </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
                                <ShopIcon className="h-7 w-7 text-foreground" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">
                                    {selectedShop.name}
                                </h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {selectedShop.shopTypeLabel} · {selectedShop.slug}
                                </p>
                                {selectedShop.city || selectedShop.region ? (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {[selectedShop.city, selectedShop.region]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <div className="rounded-xl bg-primary/10 px-4 py-3 text-center">
                            <p className="text-2xl font-semibold tabular-nums text-foreground">
                                {productTotal}
                            </p>
                            <p className="text-xs text-muted-foreground">products</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                    <label className="grid gap-1.5 text-sm">
                        <span className="font-medium text-foreground">
                            Search products in this shop
                        </span>
                        <div className="flex gap-2">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") void fetchProducts(productSearch);
                                    }}
                                    placeholder="Product name, barcode, SKU, category…"
                                    className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>
                            <Button
                                type="button"
                                onClick={() => void fetchProducts(productSearch)}
                                disabled={loading}
                            >
                                Search
                            </Button>
                        </div>
                    </label>
                </div>

                {error ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </p>
                ) : null}

                {loading ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading products…
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Showing {shopProducts.length} of {productTotal} products
                        </p>
                        <div className="overflow-hidden rounded-xl border border-border bg-card">
                            {shopProducts.length === 0 ? (
                                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                                    No products found for this shop.
                                </div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {shopProducts.map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <CatalogProductThumb
                                                    product={p}
                                                    size="lg"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-foreground">
                                                        {p.name}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                        <span>{p.categoryName}</span>
                                                        {p.barcode ? (
                                                            <span className="font-mono">
                                                                {p.barcode}
                                                            </span>
                                                        ) : null}
                                                        {p.sku ? (
                                                            <span className="font-mono">
                                                                SKU {p.sku}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <p className="mt-1 text-sm font-medium text-foreground">
                                                        GHS {p.priceGhs}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={cn(
                                                    "shrink-0 rounded-full px-2 py-0.5 text-xs capitalize",
                                                    p.status === "active"
                                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                        : "bg-muted text-muted-foreground"
                                                )}
                                            >
                                                {p.status.replace(/_/g, " ")}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
                <label className="grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Search shop name</span>
                    <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={shopSearch}
                                onChange={(e) => setShopSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") void loadShops();
                                }}
                                placeholder="Type a shop or business name…"
                                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <Button type="button" onClick={() => void loadShops()} disabled={loading}>
                            Search
                        </Button>
                    </div>
                </label>
            </div>

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            <p className="text-sm text-muted-foreground">
                {shopTotal} shops · click a shop to view all its products
            </p>

            {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading shops…
                </div>
            ) : shops.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
                    <Store className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 font-medium text-foreground">No shops found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Try a different search or register businesses on VentraPOS first.
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {shops.map((shop) => {
                        const Icon = shopTypeIcon(shop.shopType);
                        return (
                            <button
                                key={shop.id}
                                type="button"
                                onClick={() => openShop(shop)}
                                className="group rounded-xl border border-border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted transition group-hover:bg-primary/10">
                                        <Icon className="h-5 w-5 text-foreground" />
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                                </div>
                                <h3 className="mt-4 line-clamp-2 font-semibold text-foreground">
                                    {shop.name}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {shop.shopTypeLabel}
                                </p>
                                {shop.city || shop.region ? (
                                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">
                                            {[shop.city, shop.region].filter(Boolean).join(", ")}
                                        </span>
                                    </p>
                                ) : null}
                                <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-foreground">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span className="tabular-nums">{shop.productCount}</span>
                                    <span className="text-muted-foreground">products</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
