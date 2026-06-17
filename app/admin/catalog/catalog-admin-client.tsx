"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ChevronDown,
    ChevronRight,
    Loader2,
    LogOut,
    RefreshCw,
    Search,
    CloudDownload,
    UserCircle,
    Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    CatalogProductMeta,
    CatalogProductThumb,
} from "./catalog-product-display";
import { CatalogShopsPanel } from "./catalog-shops-panel";
import { CatalogOverviewPanel } from "./catalog-overview-panel";
import { CatalogSubscriptionsPanel } from "./catalog-subscriptions-panel";
import { CatalogAdminAuth } from "./catalog-admin-auth";
import { CatalogAdminTeamModal } from "./catalog-admin-team-modal";
import { CatalogAdminAccountModal } from "./catalog-admin-account-modal";
import { formatWhen } from "./catalog-admin-utils";
import {
    CatalogPagination,
    MASTER_PRODUCT_PAGE_SIZE,
    pageOffset,
} from "./catalog-pagination";
import {
    TABS,
    shopTypeIcon,
    type HierarchyNode,
    type MasterCategory,
    type MasterProduct,
    type ShopTypeRow,
    type SyncLog,
    type TabId,
} from "./catalog-admin-types";

function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

export function CatalogAdminClient() {
    const [token, setToken] = useState<string | null>(null);
    const [tab, setTab] = useState<TabId>("overview");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [shopTypes, setShopTypes] = useState<ShopTypeRow[]>([]);
    const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
    const [categories, setCategories] = useState<MasterCategory[]>([]);
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [productTotal, setProductTotal] = useState(0);
    const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
    const [syncTotal, setSyncTotal] = useState(0);

    const [search, setSearch] = useState("");
    const [shopTypeFilter, setShopTypeFilter] = useState("");
    const [sort, setSort] = useState<"name" | "updated">("name");
    const [productPage, setProductPage] = useState(0);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [backfillBusy, setBackfillBusy] = useState(false);
    const [teamOpen, setTeamOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    const authenticated = !!token;

    const totalProducts = useMemo(
        () => shopTypes.reduce((n, s) => n + s.productCount, 0),
        [shopTypes]
    );

    const apiGet = useCallback(
        async <T,>(path: string): Promise<T> => {
            if (!token) throw new Error("Not authenticated");
            const res = await fetch(path, { headers: authHeaders(token) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            return data as T;
        },
        [token]
    );

    const loadShopTypes = useCallback(async () => {
        const data = await apiGet<{ items: ShopTypeRow[] }>(
            "/api/platform/master-catalog/shop-types"
        );
        setShopTypes(data.items);
    }, [apiGet]);

    const loadHierarchy = useCallback(async () => {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        if (shopTypeFilter) params.set("shopType", shopTypeFilter);
        const data = await apiGet<{ hierarchy: HierarchyNode[] }>(
            `/api/platform/master-catalog/hierarchy?${params}`
        );
        setHierarchy(data.hierarchy);
    }, [apiGet, search, shopTypeFilter]);

    const loadCategories = useCallback(async () => {
        const params = shopTypeFilter ? `?shopType=${shopTypeFilter}` : "";
        const data = await apiGet<{ items: MasterCategory[] }>(
            `/api/platform/master-catalog/categories${params}`
        );
        setCategories(data.items);
    }, [apiGet, shopTypeFilter]);

    const loadProducts = useCallback(async () => {
        const params = new URLSearchParams({
            limit: String(MASTER_PRODUCT_PAGE_SIZE),
            offset: String(pageOffset(productPage, MASTER_PRODUCT_PAGE_SIZE)),
            sort: sort === "updated" ? "updated" : "name",
            order: "asc",
        });
        if (search.trim()) params.set("q", search.trim());
        if (shopTypeFilter) params.set("shopType", shopTypeFilter);
        const data = await apiGet<{ items: MasterProduct[]; total: number }>(
            `/api/platform/master-catalog/products?${params}`
        );
        setProducts(data.items);
        setProductTotal(data.total);
        const maxPage = Math.max(
            0,
            Math.ceil(data.total / MASTER_PRODUCT_PAGE_SIZE) - 1
        );
        if (productPage > maxPage) setProductPage(maxPage);
    }, [apiGet, search, shopTypeFilter, sort, productPage]);

    const loadSyncLogs = useCallback(async () => {
        const data = await apiGet<{ items: SyncLog[]; total: number }>(
            "/api/platform/master-catalog/sync-logs?limit=100&offset=0"
        );
        setSyncLogs(data.items);
        setSyncTotal(data.total);
    }, [apiGet]);

    const refresh = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            if (tab === "shop-types") await loadShopTypes();
            else if (tab === "catalog") await loadHierarchy();
            else if (tab === "categories") await loadCategories();
            else if (tab === "products") await loadProducts();
            else if (tab === "sync-logs") await loadSyncLogs();
            // "shops" tab is self-contained in CatalogShopsPanel
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [
        token,
        tab,
        loadShopTypes,
        loadHierarchy,
        loadCategories,
        loadProducts,
        loadSyncLogs,
    ]);

    useEffect(() => {
        if (!token) return;
        void loadShopTypes().catch(() => undefined);
    }, [token, loadShopTypes]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const runBackfill = async () => {
        if (!token) return;
        setBackfillBusy(true);
        setError(null);
        try {
            const res = await fetch("/api/platform/master-catalog/sync/backfill", {
                method: "POST",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ batchSize: 500 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            await loadShopTypes();
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Backfill failed");
        } finally {
            setBackfillBusy(false);
        }
    };

    const applyFilters = () => {
        if (tab === "products" && productPage !== 0) {
            setProductPage(0);
            return;
        }
        void refresh();
    };

    const toggleExpanded = (key: string) => {
        setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const shopTypeOptions = useMemo(
        () => shopTypes.map((s) => ({ value: s.id, label: s.label })),
        [shopTypes]
    );

    if (!authenticated) {
        return <CatalogAdminAuth onAuthenticated={setToken} />;
    }

    return (
        <div className="min-h-dvh bg-background">
            <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            VentraPOS Platform
                        </p>
                        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                            Platform Admin
                        </h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void refresh()}
                            disabled={loading || backfillBusy}
                        >
                            <RefreshCw
                                className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")}
                            />
                            Refresh
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void runBackfill()}
                            disabled={backfillBusy || loading}
                        >
                            {backfillBusy ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <CloudDownload className="mr-1.5 h-4 w-4" />
                            )}
                            Sync from shops
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAccountOpen(true)}
                        >
                            <UserCircle className="mr-1.5 h-4 w-4" />
                            My account
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setTeamOpen(true)}
                        >
                            <Users className="mr-1.5 h-4 w-4" />
                            Admins
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setToken(null)}
                        >
                            <LogOut className="mr-1.5 h-4 w-4" />
                            Sign out
                        </Button>
                    </div>
                </div>
            </header>

            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
                <aside className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                        <StatCard label="Total products" value={totalProducts} />
                        <StatCard label="Shop types" value={shopTypes.length} />
                    </div>
                    <nav className="rounded-xl border border-border bg-card p-2">
                        {(["Platform", "Catalog"] as const).map((group) => (
                            <div key={group} className="mb-1 last:mb-0">
                                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {group}
                                </p>
                                {TABS.filter((t) => t.group === group).map((t) => {
                                    const Icon = t.icon;
                                    const active = tab === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setTab(t.id)}
                                            className={cn(
                                                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                                                active
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                </aside>

                <main className="min-w-0 space-y-4">
                    {tab !== "shops" && tab !== "overview" && tab !== "subscriptions" ? (
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                            <label className="grid flex-1 gap-1.5 text-sm">
                                <span className="font-medium text-foreground">Search</span>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") applyFilters();
                                        }}
                                        placeholder="Product, shop name, barcode, SKU…"
                                        className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </label>
                            <label className="grid gap-1.5 text-sm lg:w-48">
                                <span className="font-medium text-foreground">Shop type</span>
                                <select
                                    value={shopTypeFilter}
                                    onChange={(e) => setShopTypeFilter(e.target.value)}
                                    className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground"
                                >
                                    <option value="">All types</option>
                                    {shopTypeOptions.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {tab === "products" ? (
                                <label className="grid gap-1.5 text-sm lg:w-40">
                                    <span className="font-medium text-foreground">Sort</span>
                                    <select
                                        value={sort}
                                        onChange={(e) =>
                                            setSort(e.target.value as "name" | "updated")
                                        }
                                        className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground"
                                    >
                                        <option value="name">Name</option>
                                        <option value="updated">Last updated</option>
                                    </select>
                                </label>
                            ) : null}
                            <Button type="button" onClick={applyFilters} disabled={loading}>
                                Apply filters
                            </Button>
                        </div>
                    </div>
                    ) : null}

                    {error && tab !== "shops" && tab !== "overview" && tab !== "subscriptions" ? (
                        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                            {error}
                        </p>
                    ) : null}

                    {loading && tab !== "shops" && tab !== "overview" && tab !== "subscriptions" ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Loading catalog…
                        </div>
                    ) : null}

                    {tab === "overview" && token ? (
                        <CatalogOverviewPanel token={token} />
                    ) : null}

                    {tab === "subscriptions" && token ? (
                        <CatalogSubscriptionsPanel token={token} />
                    ) : null}

                    {tab === "shops" && token ? (
                        <CatalogShopsPanel token={token} />
                    ) : null}

                    {!loading && tab === "shop-types" ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {shopTypes.map((st) => {
                                const Icon = shopTypeIcon(st.id);
                                return (
                                    <div
                                        key={st.id}
                                        className="rounded-xl border border-border bg-card p-5 transition hover:border-foreground/20 hover:shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                                <Icon className="h-5 w-5 text-foreground" />
                                            </div>
                                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums text-secondary-foreground">
                                                {st.productCount}
                                            </span>
                                        </div>
                                        <h3 className="mt-4 font-semibold text-foreground">
                                            {st.label}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {st.id}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}

                    {!loading && tab === "catalog" ? (
                        <div className="space-y-4">
                            {hierarchy.length === 0 ? (
                                <EmptyState
                                    title="No catalog data yet"
                                    description='Click "Sync from shops" to pull products, images, barcodes, and shop names from tenant inventories.'
                                />
                            ) : null}
                            {hierarchy.map((shop) => {
                                const shopKey = shop.shopType;
                                const shopOpen = expanded[shopKey] ?? true;
                                const ShopIcon = shopTypeIcon(shop.shopType);
                                return (
                                    <section
                                        key={shopKey}
                                        className="overflow-hidden rounded-xl border border-border bg-card"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleExpanded(shopKey)}
                                            className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-muted/40"
                                        >
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                                <ShopIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-foreground">
                                                    {shop.label}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {shop.productCount} products ·{" "}
                                                    {shop.categories.length} categories
                                                </div>
                                            </div>
                                            {shopOpen ? (
                                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </button>
                                        {shopOpen ? (
                                            <div className="border-t border-border px-4 pb-4 pt-2">
                                                {shop.categories.map((cat) => {
                                                    const catKey = `${shopKey}::${cat.name}`;
                                                    const catOpen = expanded[catKey] ?? false;
                                                    return (
                                                        <div key={catKey} className="mt-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleExpanded(catKey)}
                                                                className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-left text-sm transition hover:bg-muted"
                                                            >
                                                                <span className="font-medium text-foreground">
                                                                    {cat.name}
                                                                </span>
                                                                <span className="flex items-center gap-2 text-muted-foreground">
                                                                    <span className="tabular-nums">
                                                                        {cat.productCount}
                                                                    </span>
                                                                    {catOpen ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    )}
                                                                </span>
                                                            </button>
                                                            {catOpen ? (
                                                                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                                                                    {cat.products.map((p) => (
                                                                        <li
                                                                            key={p.id}
                                                                            className="flex items-center gap-3 px-3 py-3"
                                                                        >
                                                                            <CatalogProductThumb
                                                                                product={p}
                                                                                size="md"
                                                                            />
                                                                            <div className="min-w-0 flex-1">
                                                                                <CatalogProductMeta product={p} />
                                                                            </div>
                                                                            <span className="hidden shrink-0 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
                                                                                {p.shopTypeLabel}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : null}
                                    </section>
                                );
                            })}
                        </div>
                    ) : null}

                    {!loading && tab === "categories" ? (
                        <DataTable
                            headers={["Shop type", "Category", "Products"]}
                            rows={categories.map((c) => [
                                c.shopType,
                                c.name,
                                String(c.productCount),
                            ])}
                            alignRight={[2]}
                        />
                    ) : null}

                    {!loading && tab === "products" ? (
                        <>
                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                <ul className="divide-y divide-border">
                                    {products.map((p) => (
                                        <li
                                            key={p.id}
                                            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                                        >
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <CatalogProductThumb product={p} size="lg" />
                                                <div className="min-w-0 flex-1">
                                                    <CatalogProductMeta product={p} />
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <Badge>{p.shopTypeLabel}</Badge>
                                                        <Badge variant="muted">{p.categoryName}</Badge>
                                                        {p.unit ? (
                                                            <Badge variant="muted">{p.unit}</Badge>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right text-xs text-muted-foreground">
                                                Synced {formatWhen(p.syncedAt)}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                {products.length === 0 ? (
                                    <div className="p-8">
                                        <EmptyState
                                            title="No products found"
                                            description="Try syncing from shops or adjusting your filters."
                                        />
                                    </div>
                                ) : null}
                            </div>
                            <CatalogPagination
                                total={productTotal}
                                page={productPage}
                                pageSize={MASTER_PRODUCT_PAGE_SIZE}
                                onPageChange={setProductPage}
                                disabled={loading}
                            />
                        </>
                    ) : null}

                    {!loading && tab === "sync-logs" ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Latest {syncLogs.length} of {syncTotal} entries
                            </p>
                            <DataTable
                                headers={["Time", "Action", "Product", "Shop type", "Status"]}
                                rows={syncLogs.map((log) => [
                                    formatWhen(log.createdAt),
                                    log.action,
                                    log.productName ?? "—",
                                    log.shopType ?? "—",
                                    log.status,
                                ])}
                                statusCol={4}
                            />
                        </>
                    ) : null}
                </main>
            </div>

            {token ? (
                <>
                    <CatalogAdminAccountModal
                        token={token}
                        open={accountOpen}
                        onClose={() => setAccountOpen(false)}
                    />
                    <CatalogAdminTeamModal
                        token={token}
                        open={teamOpen}
                        onClose={() => setTeamOpen(false)}
                    />
                </>
            ) : null}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
    );
}

function Badge({
    children,
    variant = "default",
}: {
    children: React.ReactNode;
    variant?: "default" | "muted";
}) {
    return (
        <span
            className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                variant === "muted"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-foreground"
            )}
        >
            {children}
        </span>
    );
}

function EmptyState({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <p className="font-medium text-foreground">{title}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

function DataTable({
    headers,
    rows,
    alignRight = [],
    statusCol,
}: {
    headers: string[];
    rows: string[][];
    alignRight?: number[];
    statusCol?: number;
}) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                    <tr>
                        {headers.map((h, i) => (
                            <th
                                key={h}
                                className={cn(
                                    "px-4 py-3 font-medium",
                                    alignRight.includes(i) && "text-right"
                                )}
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className="border-b border-border/60 last:border-0">
                            {row.map((cell, ci) => (
                                <td
                                    key={ci}
                                    className={cn(
                                        "px-4 py-3",
                                        alignRight.includes(ci) && "text-right tabular-nums"
                                    )}
                                >
                                    {statusCol === ci ? (
                                        <span
                                            className={cn(
                                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                                cell === "success"
                                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                                    : "bg-destructive/15 text-destructive"
                                            )}
                                        >
                                            {cell}
                                        </span>
                                    ) : (
                                        cell
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
