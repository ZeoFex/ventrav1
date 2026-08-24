"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Loader2,
    Minus,
    Plus,
    ShoppingBag,
    SlidersHorizontal,
    Store,
    Trash2,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogProductImage } from "@/app/components/dashboard/products/catalog-product-image";
import { CatalogAdminAuth } from "../catalog/catalog-admin-auth";
import { StorefrontFilters } from "./storefront-filters";
import { StorefrontPagination } from "./storefront-pagination";
import {
    authHeaders,
    formatGhs,
    readAdminToken,
    readResponseJson,
    writeAdminToken,
} from "../catalog/catalog-admin-utils";

type StorefrontProduct = {
    id: string;
    name: string;
    description: string | null;
    imageSrc: string | null;
    sku: string | null;
    barcode: string | null;
    unit: string | null;
    priceGhs: string;
    stock: number;
    categoryName: string;
    shopId: string;
    shopName: string;
    shopType: string;
    shopTypeLabel: string;
    city: string | null;
};

type StorefrontMeta = {
    shops: {
        id: string;
        name: string;
        city: string | null;
        shopType: string;
        shopTypeLabel: string;
        productCount: number;
    }[];
    shopTypes: { id: string; label: string; productCount: number }[];
    categories: { name: string; count: number }[];
};

type BagItem = { product: StorefrontProduct; qty: number };

const PAGE_SIZE = 24;

export function AdminStorefrontClient() {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [meta, setMeta] = useState<StorefrontMeta | null>(null);
    const [items, setItems] = useState<StorefrontProduct[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [q, setQ] = useState("");
    const [search, setSearch] = useState("");
    const [shopId, setShopId] = useState("");
    const [shopType, setShopType] = useState("");
    const [category, setCategory] = useState("");
    const [selected, setSelected] = useState<StorefrontProduct | null>(null);
    const [bag, setBag] = useState<BagItem[]>([]);
    const [bagOpen, setBagOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);

    useEffect(() => {
        setToken(readAdminToken());
        setReady(true);
    }, []);

    const handleAuthenticated = (next: string) => {
        writeAdminToken(next);
        setToken(next);
    };

    const signOut = () => {
        writeAdminToken(null);
        setToken(null);
        router.push("/admin/catalog");
    };

    useEffect(() => {
        const id = window.setTimeout(() => {
            const next = q.trim();
            setSearch((prev) => {
                if (prev !== next) setPage(0);
                return next;
            });
        }, 250);
        return () => window.clearTimeout(id);
    }, [q]);

    useEffect(() => {
        if (!token) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/platform/storefront/meta", {
                    headers: authHeaders(token),
                    cache: "no-store",
                });
                const data = await readResponseJson<StorefrontMeta>(res);
                if (!cancelled && res.ok) setMeta(data);
            } catch {
                /* filters stay empty */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const loadProducts = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE),
                offset: String(page * PAGE_SIZE),
            });
            if (search) params.set("q", search);
            if (shopId) params.set("shopId", shopId);
            if (shopType) params.set("shopType", shopType);
            if (category) params.set("category", category);
            const res = await fetch(`/api/platform/storefront/products?${params}`, {
                headers: authHeaders(token),
                cache: "no-store",
            });
            const data = await readResponseJson<{
                items?: StorefrontProduct[];
                total?: number;
                error?: string;
            }>(res);
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setTotal(Number(data.total ?? 0));
            setItems(Array.isArray(data.items) ? data.items : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load the store");
        } finally {
            setLoading(false);
        }
    }, [token, search, shopId, shopType, category, page]);

    useEffect(() => {
        void loadProducts();
    }, [loadProducts]);

    const bagCount = bag.reduce((n, i) => n + i.qty, 0);
    const bagTotal = bag.reduce((n, i) => n + Number(i.product.priceGhs) * i.qty, 0);

    const addToBag = (product: StorefrontProduct) => {
        if (product.stock <= 0) return;
        setBag((prev) => {
            const hit = prev.find((i) => i.product.id === product.id);
            if (!hit) return [...prev, { product, qty: 1 }];
            const max = Math.max(1, product.stock);
            return prev.map((i) =>
                i.product.id === product.id
                    ? { ...i, qty: Math.min(max, i.qty + 1) }
                    : i,
            );
        });
        setBagOpen(true);
    };

    const setQty = (id: string, qty: number) => {
        setBag((prev) =>
            qty <= 0
                ? prev.filter((i) => i.product.id !== id)
                : prev.map((i) => (i.product.id === id ? { ...i, qty } : i)),
        );
    };

    const removeFromBag = (id: string) => {
        setBag((prev) => prev.filter((i) => i.product.id !== id));
    };

    const clearBag = () => setBag([]);

    const hasFilters = Boolean(shopId || shopType || category || search);

    const goToPage = (next: number) => {
        setPage(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const selectShop = (id: string) => {
        setShopId(id);
        setPage(0);
    };
    const selectShopType = (id: string) => {
        setShopType(id);
        setPage(0);
    };
    const selectCategory = (name: string) => {
        setCategory(name);
        setPage(0);
    };

    const clearFilters = () => {
        setQ("");
        setSearch("");
        setShopId("");
        setShopType("");
        setCategory("");
        setPage(0);
    };

    if (!ready) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-[#f4f1ea] text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening storefront…
            </div>
        );
    }

    if (!token) {
        return <CatalogAdminAuth onAuthenticated={handleAuthenticated} />;
    }

    return (
        <div className="min-h-dvh bg-[#f4f1ea] text-[#1c1917] dark:bg-[#0c0c0c] dark:text-zinc-100">
            <div className="border-b border-[#e7e0d4] bg-[#1f3d32] text-[#f4f1ea] dark:border-white/10 dark:bg-[#10231c]">
                <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.16em] sm:px-8">
                    <span>Private admin preview · not listed on the public site</span>
                    <Link href="/admin/catalog" className="hover:underline">
                        Back to admin
                    </Link>
                </div>
            </div>

            <header className="sticky top-0 z-30 border-b border-[#e7e0d4] bg-[#f4f1ea]/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0c0c0c]/90">
                <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-3 sm:px-8">
                    <Link
                        href="/admin/catalog"
                        className="inline-flex size-10 items-center justify-center rounded-full border border-[#e7e0d4] bg-white text-[#1f3d32] hover:bg-[#efe8dc] dark:border-white/10 dark:bg-white/5 dark:text-[#6ffbbe]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6b8f7c]">
                            Ventra Market
                        </p>
                        <h1 className="truncate font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                            Shop the live catalog
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersOpen(true)}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-[#e7e0d4] bg-white px-3 text-sm font-medium lg:hidden dark:border-white/10 dark:bg-white/5"
                    >
                        <SlidersHorizontal className="size-4" />
                        Filters
                    </button>
                    <button
                        type="button"
                        onClick={() => setBagOpen(true)}
                        className="relative inline-flex h-10 items-center gap-2 rounded-full bg-[#1f3d32] px-4 text-sm font-medium text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                    >
                        <ShoppingBag className="size-4" />
                        Bag
                        {bagCount > 0 ? (
                            <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[#c45c26] text-[10px] font-bold text-white">
                                {bagCount}
                            </span>
                        ) : null}
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-[90rem] px-4 pb-20 sm:px-8">
                <div className="mt-6 flex items-start gap-8">
                    <aside className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] w-[19.5rem] shrink-0 self-start overflow-y-auto lg:block">
                        <StorefrontFilters
                            q={q}
                            setQ={setQ}
                            shopId={shopId}
                            setShopId={selectShop}
                            shopType={shopType}
                            setShopType={selectShopType}
                            category={category}
                            setCategory={selectCategory}
                            meta={meta}
                            hasFilters={hasFilters}
                            clearFilters={clearFilters}
                            resultCount={total}
                            signOut={signOut}
                        />
                    </aside>

                    <section className="min-w-0 flex-1 px-1 sm:px-2">
                        {error ? (
                            <p className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                            </p>
                        ) : null}

                        {loading && items.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8a8478]">
                                <Loader2 className="size-4 animate-spin" />
                                Loading the market…
                            </div>
                        ) : items.length === 0 ? (
                            <div className="rounded-[2rem] border border-dashed border-[#e7e0d4] px-6 py-20 text-center dark:border-white/10">
                                <Store className="mx-auto mb-3 size-8 opacity-40" />
                                <p className="font-medium">No products match these filters.</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-1 flex items-center justify-between px-3">
                                    <p className="text-sm text-[#8a8478]">
                                        Page{" "}
                                        <span className="font-medium tabular-nums text-[#1c1917] dark:text-zinc-100">
                                            {page + 1}
                                        </span>{" "}
                                        of{" "}
                                        <span className="font-medium tabular-nums text-[#1c1917] dark:text-zinc-100">
                                            {Math.max(1, Math.ceil(total / PAGE_SIZE))}
                                        </span>
                                    </p>
                                    {loading ? (
                                        <Loader2 className="size-4 animate-spin text-[#8a8478]" />
                                    ) : null}
                                </div>
                                <div
                                    className={
                                        loading
                                            ? "pointer-events-none opacity-50 transition-opacity"
                                            : "transition-opacity"
                                    }
                                >
                                    <ul className="grid gap-7 p-2 sm:grid-cols-2 sm:p-3 xl:grid-cols-3">
                                    {items.map((product) => (
                                        <li key={product.id} className="p-1">
                                            <article className="group flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-[#e7e0d4] bg-white p-3 shadow-[0_12px_40px_-24px_rgba(31,61,50,0.45)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-[#141414] sm:p-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelected(product)}
                                                    className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] bg-[#efe8dc] dark:bg-white/5"
                                                >
                                                    {product.imageSrc ? (
                                                        <CatalogProductImage
                                                            src={product.imageSrc}
                                                            alt={product.name}
                                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center text-[#b7b09f]">
                                                            <Store className="size-10" />
                                                        </div>
                                                    )}
                                                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#1f3d32]">
                                                        {product.categoryName}
                                                    </span>
                                                </button>
                                                <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                                                    <p className="text-xs text-[#8a8478]">
                                                        {product.shopName}
                                                        {product.city ? ` · ${product.city}` : ""}
                                                    </p>
                                                    <h3 className="mt-1 line-clamp-2 font-[family-name:var(--font-display)] text-base font-semibold">
                                                        {product.name}
                                                    </h3>
                                                    <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                                                        <div>
                                                            <p className="text-lg font-semibold tabular-nums">
                                                                {formatGhs(product.priceGhs)}
                                                            </p>
                                                            <p className="text-xs text-[#8a8478]">
                                                                {product.stock > 0
                                                                    ? `${product.stock} in stock`
                                                                    : "Out of stock"}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            disabled={product.stock <= 0}
                                                            onClick={() => addToBag(product)}
                                                            className="rounded-full bg-[#1f3d32] text-white hover:bg-[#172e26] dark:bg-[#6ffbbe] dark:text-[#003527]"
                                                        >
                                                            Add
                                                        </Button>
                                                    </div>
                                                </div>
                                            </article>
                                        </li>
                                    ))}
                                    </ul>
                                </div>
                                <StorefrontPagination
                                    total={total}
                                    page={page}
                                    pageSize={PAGE_SIZE}
                                    disabled={loading}
                                    onPageChange={goToPage}
                                />
                            </>
                        )}
                    </section>
                </div>
            </main>

            {filtersOpen ? (
                <div className="fixed inset-0 z-40 flex lg:hidden">
                    <button
                        type="button"
                        aria-label="Close filters"
                        className="flex-1 bg-black/40"
                        onClick={() => setFiltersOpen(false)}
                    />
                    <aside className="flex h-full w-80 max-w-[88vw] flex-col bg-[#f4f1ea] dark:bg-[#0c0c0c]">
                        <div className="flex items-center justify-between border-b border-[#e7e0d4] px-4 py-4 dark:border-white/10">
                            <h3 className="font-semibold">Filters</h3>
                            <button type="button" onClick={() => setFiltersOpen(false)}>
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            <StorefrontFilters
                                q={q}
                                setQ={setQ}
                                shopId={shopId}
                                setShopId={selectShop}
                                shopType={shopType}
                                setShopType={selectShopType}
                                category={category}
                                setCategory={selectCategory}
                                meta={meta}
                                hasFilters={hasFilters}
                                clearFilters={clearFilters}
                                resultCount={total}
                                signOut={signOut}
                            />
                        </div>
                    </aside>
                </div>
            ) : null}

            {selected ? (
                <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
                    <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[1.8rem] bg-white p-5 sm:rounded-[1.8rem] dark:bg-[#141414]">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs text-[#8a8478]">{selected.shopName}</p>
                                <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold">
                                    {selected.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="rounded-full border border-[#e7e0d4] p-2 dark:border-white/10"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="mt-4 overflow-hidden rounded-2xl bg-[#efe8dc] dark:bg-white/5">
                            {selected.imageSrc ? (
                                <CatalogProductImage
                                    src={selected.imageSrc}
                                    alt={selected.name}
                                    className="max-h-80 w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-48 items-center justify-center text-[#b7b09f]">
                                    <Store className="size-12" />
                                </div>
                            )}
                        </div>
                        <p className="mt-4 text-2xl font-semibold">{formatGhs(selected.priceGhs)}</p>
                        <p className="mt-2 text-sm leading-6 text-[#5c574e] dark:text-zinc-300">
                            {selected.description || "No description on this product yet."}
                        </p>
                        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <Meta label="Shop" value={selected.shopName} />
                            <Meta label="Type" value={selected.shopTypeLabel} />
                            <Meta label="Category" value={selected.categoryName} />
                            <Meta
                                label="Stock"
                                value={
                                    selected.stock > 0 ? `${selected.stock} ${selected.unit || "pcs"}` : "Out of stock"
                                }
                            />
                            <Meta label="SKU" value={selected.sku || "—"} />
                            <Meta label="Barcode" value={selected.barcode || "—"} />
                        </dl>
                        <Button
                            type="button"
                            disabled={selected.stock <= 0}
                            onClick={() => {
                                addToBag(selected);
                                setSelected(null);
                            }}
                            className="mt-6 w-full rounded-full bg-[#1f3d32] py-6 text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                        >
                            Add to preview bag
                        </Button>
                    </div>
                </div>
            ) : null}

            {bagOpen ? (
                <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
                    <aside className="flex h-full w-full max-w-md flex-col bg-white dark:bg-[#141414]">
                        <div className="flex items-center justify-between border-b border-[#e7e0d4] px-5 py-4 dark:border-white/10">
                            <div>
                                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
                                    Preview bag
                                </h3>
                                <p className="text-xs text-[#8a8478]">
                                    Checkout is off — this is an admin-only look.
                                </p>
                            </div>
                            <button type="button" onClick={() => setBagOpen(false)}>
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                            {bag.length === 0 ? (
                                <p className="py-16 text-center text-sm text-[#8a8478]">
                                    Your preview bag is empty.
                                </p>
                            ) : (
                                <ul className="space-y-4">
                                    {bag.map((item) => (
                                        <li
                                            key={item.product.id}
                                            className="flex items-start gap-3 rounded-2xl border border-[#e7e0d4] p-3 dark:border-white/10"
                                        >
                                            <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#efe8dc] dark:bg-white/5">
                                                {item.product.imageSrc ? (
                                                    <CatalogProductImage
                                                        src={item.product.imageSrc}
                                                        alt={item.product.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {item.product.name}
                                                </p>
                                                <p className="text-xs text-[#8a8478]">
                                                    {formatGhs(item.product.priceGhs)}
                                                </p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setQty(item.product.id, item.qty - 1)
                                                        }
                                                        className="rounded-full border p-1"
                                                    >
                                                        <Minus className="size-3" />
                                                    </button>
                                                    <span className="w-6 text-center text-sm">
                                                        {item.qty}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setQty(
                                                                item.product.id,
                                                                Math.min(item.product.stock, item.qty + 1),
                                                            )
                                                        }
                                                        className="rounded-full border p-1"
                                                    >
                                                        <Plus className="size-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label={`Remove ${item.product.name}`}
                                                onClick={() => removeFromBag(item.product.id)}
                                                className="rounded-full p-2 text-[#8a8478] hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="border-t border-[#e7e0d4] px-5 py-4 dark:border-white/10">
                            <div className="mb-3 flex justify-between text-sm font-semibold">
                                <span>Preview total</span>
                                <span>{formatGhs(bagTotal)}</span>
                            </div>
                            {bag.length > 0 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearBag}
                                    className="mb-2 w-full rounded-full"
                                >
                                    Remove all items
                                </Button>
                            ) : null}
                            <Button type="button" disabled className="w-full rounded-full">
                                Checkout unavailable in admin preview
                            </Button>
                        </div>
                    </aside>
                </div>
            ) : null}
        </div>
    );
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-[#f4f1ea] px-3 py-2 dark:bg-white/5">
            <p className="text-[10px] uppercase tracking-wide text-[#8a8478]">{label}</p>
            <p className="mt-0.5 truncate font-medium">{value}</p>
        </div>
    );
}
