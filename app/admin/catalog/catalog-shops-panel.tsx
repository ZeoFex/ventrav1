"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ArrowLeft,
    ChevronRight,
    CreditCard,
    LayoutGrid,
    Loader2,
    Mail,
    MapPin,
    Package,
    Phone,
    Plus,
    Search,
    Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CatalogProductThumb } from "./catalog-product-display";
import { CatalogAddProductModal } from "./catalog-add-product-modal";
import type { CatalogShop, ShopDetailTab, ShopProduct } from "./catalog-admin-types";
import { shopTypeIcon } from "./catalog-admin-types";
import { authHeaders, formatDate } from "./catalog-admin-utils";
import {
    AccountStatusBadge,
    PlanBadge,
    SubscriptionStatusBadge,
} from "./catalog-status-badge";
import { CatalogShopSubscriptionPanel } from "./catalog-shop-subscription-panel";
import { CatalogShopInsightsPanel } from "./catalog-shop-insights-panel";
import { CatalogBulkShopDelete } from "./catalog-bulk-shop-delete";
import {
    CatalogPagination,
    pageOffset,
    PRODUCT_PAGE_SIZE,
    SHOP_PAGE_SIZE,
} from "./catalog-pagination";

function ShopEmails({ emails }: { emails: string[] }) {
    if (emails.length === 0) {
        return <p className="text-xs text-muted-foreground">No registered email</p>;
    }
    return (
        <ul className="space-y-0.5">
            {emails.map((email) => (
                <li
                    key={email}
                    className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"
                >
                    <Mail className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">{email}</span>
                </li>
            ))}
        </ul>
    );
}

const DETAIL_TABS: { id: ShopDetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "products", label: "Products", icon: Package },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "insights", label: "Insights", icon: LayoutGrid },
];

export function CatalogShopsPanel({
    token,
    focusBusinessId,
}: {
    token: string;
    focusBusinessId?: string | null;
}) {
    const [shopSearch, setShopSearch] = useState("");
    const [shopPage, setShopPage] = useState(0);
    const [productSearch, setProductSearch] = useState("");
    const [appliedProductSearch, setAppliedProductSearch] = useState("");
    const [productPage, setProductPage] = useState(0);
    const [selectedShop, setSelectedShop] = useState<CatalogShop | null>(null);
    const [detailTab, setDetailTab] = useState<ShopDetailTab>("products");
    const [shops, setShops] = useState<CatalogShop[]>([]);
    const [shopTotal, setShopTotal] = useState(0);
    const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
    const [productTotal, setProductTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [productsLoading, setProductsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [addProductOpen, setAddProductOpen] = useState(false);
    const [selectedShops, setSelectedShops] = useState<Map<string, CatalogShop>>(new Map());
    const [shopQuery, setShopQuery] = useState("");

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
            const params = new URLSearchParams({
                limit: String(SHOP_PAGE_SIZE),
                offset: String(pageOffset(shopPage, SHOP_PAGE_SIZE)),
                sort: "name",
            });
            if (shopQuery.trim()) params.set("q", shopQuery.trim());
            const data = await apiGet<{ items: CatalogShop[]; total: number }>(
                `/api/platform/master-catalog/shops?${params}`
            );
            setShops(data.items);
            setShopTotal(data.total);
            const maxPage = Math.max(0, Math.ceil(data.total / SHOP_PAGE_SIZE) - 1);
            if (shopPage > maxPage) setShopPage(maxPage);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load shops");
        } finally {
            setLoading(false);
        }
    }, [apiGet, shopQuery, shopPage]);

    const shopId = selectedShop?.id;

    const fetchProducts = useCallback(
        async (query: string, page: number) => {
            if (!shopId) return;
            setProductsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({
                    limit: String(PRODUCT_PAGE_SIZE),
                    offset: String(pageOffset(page, PRODUCT_PAGE_SIZE)),
                    sort: "name",
                    order: "asc",
                });
                if (query.trim()) params.set("q", query.trim());
                const data = await apiGet<{
                    items: ShopProduct[];
                    total: number;
                    shop: CatalogShop;
                }>(
                    `/api/platform/master-catalog/shops/${shopId}/products?${params}`
                );
                setShopProducts(data.items);
                setProductTotal(data.total);
                if (data.shop) setSelectedShop(data.shop);
                const maxPage = Math.max(0, Math.ceil(data.total / PRODUCT_PAGE_SIZE) - 1);
                if (page > maxPage) setProductPage(maxPage);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load products");
            } finally {
                setProductsLoading(false);
            }
        },
        [apiGet, shopId]
    );

    useEffect(() => {
        if (selectedShop) return;
        void loadShops();
    }, [loadShops, selectedShop]);

    useEffect(() => {
        if (!focusBusinessId) return;
        let cancelled = false;
        (async () => {
            try {
                const data = await apiGet<{ shop: CatalogShop }>(
                    `/api/platform/master-catalog/shops/${focusBusinessId}/products?limit=1&offset=0`
                );
                if (cancelled || !data.shop) return;
                setProductSearch("");
                setAppliedProductSearch("");
                setProductPage(0);
                setDetailTab("products");
                setSelectedShop(data.shop);
            } catch {
                // Shop may have been deleted; stay on list view.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [focusBusinessId, apiGet]);

    useEffect(() => {
        if (!shopId || detailTab !== "products") return;
        void fetchProducts(appliedProductSearch, productPage);
    }, [shopId, detailTab, productPage, appliedProductSearch, fetchProducts]);

    const searchShops = () => {
        setShopQuery(shopSearch);
        setShopPage(0);
    };

    const searchProducts = () => {
        setAppliedProductSearch(productSearch);
        setProductPage(0);
    };

    const openShop = (shop: CatalogShop) => {
        setProductSearch("");
        setAppliedProductSearch("");
        setProductPage(0);
        setDetailTab("products");
        setSelectedShop(shop);
    };

    const backToShops = () => {
        setSelectedShop(null);
        setShopProducts([]);
        setProductTotal(0);
        setProductPage(0);
    };

    const patchShop = (patch: Partial<CatalogShop>) => {
        if (!selectedShop) return;
        const next = { ...selectedShop, ...patch };
        setSelectedShop(next);
        setShops((prev) => prev.map((s) => (s.id === next.id ? { ...s, ...patch } : s)));
    };

    const toggleShop = (shop: CatalogShop, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedShops((prev) => {
            const next = new Map(prev);
            if (next.has(shop.id)) next.delete(shop.id);
            else next.set(shop.id, shop);
            return next;
        });
    };

    const allPageSelected =
        shops.length > 0 && shops.every((s) => selectedShops.has(s.id));

    const toggleAllPage = () => {
        setSelectedShops((prev) => {
            const next = new Map(prev);
            if (allPageSelected) {
                for (const s of shops) next.delete(s.id);
            } else {
                for (const s of shops) next.set(s.id, s);
            }
            return next;
        });
    };

    const handleBulkDeleted = (deletedIds: string[]) => {
        setSelectedShops((prev) => {
            const next = new Map(prev);
            for (const id of deletedIds) next.delete(id);
            return next;
        });
        setShopTotal((n) => Math.max(0, n - deletedIds.length));
        setShops((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
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
                    {detailTab === "products" ? (
                        <Button type="button" size="sm" onClick={() => setAddProductOpen(true)}>
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add product
                        </Button>
                    ) : null}
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted">
                                <ShopIcon className="h-7 w-7 text-foreground" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-semibold text-foreground">
                                    {selectedShop.name}
                                </h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {selectedShop.shopTypeLabel} · {selectedShop.slug}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <PlanBadge plan={selectedShop.plan} />
                                    <SubscriptionStatusBadge
                                        status={selectedShop.subscriptionStatus}
                                        periodEnd={selectedShop.currentPeriodEnd}
                                    />
                                    <AccountStatusBadge status={selectedShop.status} />
                                </div>
                                {(selectedShop.city || selectedShop.region) && (
                                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {[selectedShop.city, selectedShop.region]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>
                                )}
                                {selectedShop.phone ? (
                                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5" />
                                        {selectedShop.phone}
                                    </p>
                                ) : null}
                                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
                                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                        Registered emails
                                    </p>
                                    <ShopEmails emails={selectedShop.registeredEmails} />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            <MetricPill label="Products" value={productTotal || selectedShop.productCount} />
                            <MetricPill label="Branches" value={selectedShop.branchCount} />
                            <MetricPill
                                label="Period end"
                                value={formatDate(selectedShop.currentPeriodEnd)}
                                small
                            />
                        </div>
                    </div>
                </div>

                <nav className="flex gap-1 rounded-xl border border-border bg-card p-1">
                    {DETAIL_TABS.map((t) => {
                        const Icon = t.icon;
                        const active = detailTab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setDetailTab(t.id)}
                                className={cn(
                                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                                    active
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden sm:inline">{t.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {detailTab === "subscription" ? (
                    <CatalogShopSubscriptionPanel
                        token={token}
                        shop={selectedShop}
                        onUpdated={patchShop}
                        onDeleted={() => {
                            setShops((prev) => prev.filter((s) => s.id !== selectedShop.id));
                            setSelectedShops((prev) => {
                                const next = new Map(prev);
                                next.delete(selectedShop.id);
                                return next;
                            });
                            setShopTotal((n) => Math.max(0, n - 1));
                            backToShops();
                        }}
                    />
                ) : null}

                {detailTab === "insights" ? (
                    <CatalogShopInsightsPanel token={token} shop={selectedShop} />
                ) : null}

                {detailTab === "products" ? (
                    <>
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
                                                if (e.key === "Enter") searchProducts();
                                            }}
                                            placeholder="Product name, barcode, SKU, category…"
                                            className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={searchProducts}
                                        disabled={productsLoading}
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

                        {productsLoading ? (
                            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading products…
                            </div>
                        ) : (
                            <>
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
                                                        <CatalogProductThumb product={p} size="lg" />
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
                                                            <div className="mt-1.5 flex flex-wrap items-center gap-3">
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    GHS {p.priceGhs}
                                                                </p>
                                                                <p
                                                                    className={cn(
                                                                        "text-xs tabular-nums",
                                                                        p.stock <= 0
                                                                            ? "text-destructive"
                                                                            : p.stock <= 5
                                                                              ? "text-amber-600"
                                                                              : "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {p.stock} in stock
                                                                </p>
                                                            </div>
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

                                <CatalogPagination
                                    total={productTotal}
                                    page={productPage}
                                    pageSize={PRODUCT_PAGE_SIZE}
                                    onPageChange={setProductPage}
                                    disabled={productsLoading}
                                />
                            </>
                        )}

                        <CatalogAddProductModal
                            open={addProductOpen}
                            onClose={() => setAddProductOpen(false)}
                            shop={selectedShop}
                            token={token}
                            onSaved={() => void fetchProducts(appliedProductSearch, productPage)}
                        />
                    </>
                ) : null}
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
                                    if (e.key === "Enter") searchShops();
                                }}
                                placeholder="Shop name, email, or phone…"
                                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <Button type="button" onClick={searchShops} disabled={loading}>
                            Search
                        </Button>
                    </div>
                </label>
            </div>

            <CatalogBulkShopDelete
                token={token}
                shops={Array.from(selectedShops.values())}
                selectedIds={new Set(selectedShops.keys())}
                onClearSelection={() => setSelectedShops(new Map())}
                onDeleted={handleBulkDeleted}
            />

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    {shopTotal} shops · click a card to open, or select multiple to delete
                </p>
                {shops.length > 0 ? (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={toggleAllPage}
                            className="size-4 rounded border-input"
                        />
                        Select all on page
                    </label>
                ) : null}
            </div>

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
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {shops.map((shop) => {
                            const Icon = shopTypeIcon(shop.shopType);
                            const checked = selectedShops.has(shop.id);
                            return (
                                <div
                                    key={shop.id}
                                    className={cn(
                                        "group relative rounded-xl border bg-card transition hover:shadow-md",
                                        checked
                                            ? "border-primary ring-2 ring-primary/20"
                                            : "border-border hover:border-primary/40"
                                    )}
                                >
                                    <div className="absolute left-3 top-3 z-10">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => undefined}
                                            onClick={(e) => toggleShop(shop, e)}
                                            aria-label={`Select ${shop.name}`}
                                            className="size-4 rounded border-input bg-background"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openShop(shop)}
                                        className="w-full p-5 pt-8 text-left"
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
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            <PlanBadge plan={shop.plan} />
                                            <SubscriptionStatusBadge
                                                status={shop.subscriptionStatus}
                                                periodEnd={shop.currentPeriodEnd}
                                            />
                                        </div>
                                        {shop.city || shop.region ? (
                                            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {[shop.city, shop.region].filter(Boolean).join(", ")}
                                                </span>
                                            </p>
                                        ) : null}
                                        <div className="mt-3 border-t border-border pt-3">
                                            <ShopEmails emails={shop.registeredEmails} />
                                        </div>
                                        <div className="mt-3 flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-1.5 font-medium text-foreground">
                                                <Package className="h-4 w-4 text-muted-foreground" />
                                                <span className="tabular-nums">{shop.productCount}</span>
                                                <span className="text-muted-foreground">products</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {shop.branchCount} branch
                                                {shop.branchCount === 1 ? "" : "es"}
                                            </span>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <CatalogPagination
                        total={shopTotal}
                        page={shopPage}
                        pageSize={SHOP_PAGE_SIZE}
                        onPageChange={setShopPage}
                        disabled={loading}
                    />
                </>
            )}
        </div>
    );
}

function MetricPill({
    label,
    value,
    small,
}: {
    label: string;
    value: number | string;
    small?: boolean;
}) {
    return (
        <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-center">
            <p
                className={cn(
                    "font-semibold tabular-nums text-foreground",
                    small ? "text-xs" : "text-xl"
                )}
            >
                {value}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
        </div>
    );
}
