"use client";

import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { TABS, type TabId } from "./catalog-admin-types";

const VENTRA_ACCENT = "text-[#006c49] dark:text-[#6ffbbe]";
const VENTRA_ACTIVE_BG = "bg-[#003527]/10 dark:bg-[#6ffbbe]/10";

type Props = {
    tab: TabId;
    onTabChange: (tab: TabId) => void;
    totalProducts: number;
    shopTypeCount: number;
    mobileOpen: boolean;
    onMobileOpenChange: (open: boolean) => void;
};

function Brand({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <button
            type="button"
            onClick={onNavigate}
            className="flex w-full min-w-0 items-center gap-3 px-1 py-1 text-left transition-opacity hover:opacity-90"
        >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#006c49] text-white shadow-sm dark:bg-[#6ffbbe] dark:text-[#003527]">
                <span className="text-[17px] font-black italic tracking-tighter">V</span>
            </div>
            <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-display)] text-[17px] font-bold tracking-tight text-foreground">
                    VentraPOS
                </p>
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Platform Admin
                </p>
            </div>
        </button>
    );
}

function NavContent({
    tab,
    onTabChange,
    totalProducts,
    shopTypeCount,
    onNavigate,
    showBrand = true,
}: Omit<Props, "mobileOpen" | "onMobileOpenChange"> & {
    onNavigate?: () => void;
    showBrand?: boolean;
}) {
    const groups = ["Platform", "Catalog"] as const;

    return (
        <div className="flex h-full min-h-0 flex-col">
            {showBrand ? (
                <div className="shrink-0 border-b border-[#bfc9c3]/15 px-4 py-5 dark:border-white/[0.06]">
                    <Brand onNavigate={onNavigate} />
                </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                <nav className="flex flex-col gap-4" aria-label="Platform admin">
                    {groups.map((group) => (
                        <div key={group}>
                            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                {group}
                            </p>
                            <ul className="flex flex-col gap-0.5">
                                {TABS.filter((t) => t.group === group).map((t) => {
                                    const Icon = t.icon;
                                    const active = tab === t.id;
                                    return (
                                        <li key={t.id}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onTabChange(t.id);
                                                    onNavigate?.();
                                                }}
                                                className={cn(
                                                    "flex w-full min-h-[2.75rem] items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors",
                                                    active
                                                        ? cn(VENTRA_ACTIVE_BG, VENTRA_ACCENT)
                                                        : "text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#1a1a1a]"
                                                )}
                                                aria-current={active ? "page" : undefined}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "h-[18px] w-[18px] shrink-0",
                                                        active ? VENTRA_ACCENT : "text-muted-foreground"
                                                    )}
                                                    aria-hidden
                                                />
                                                <span className="truncate">{t.label}</span>
                                                {active ? (
                                                    <span
                                                        className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]"
                                                        aria-hidden
                                                    />
                                                ) : null}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </div>

            <div className="shrink-0 space-y-3 border-t border-[#bfc9c3]/15 px-4 py-4 dark:border-white/[0.06]">
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[#bfc9c3]/20 bg-white/60 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Products
                        </p>
                        <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums text-foreground">
                            {totalProducts.toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-xl border border-[#bfc9c3]/20 bg-white/60 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.02]">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Types
                        </p>
                        <p className="mt-0.5 font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums text-foreground">
                            {shopTypeCount}
                        </p>
                    </div>
                </div>
                <div className="flex justify-center">
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
}

export function CatalogAdminSidebar(props: Props) {
    const { mobileOpen, onMobileOpenChange, tab, onTabChange } = props;

    return (
        <>
            {/* Desktop sidebar */}
            <aside
                className="dashboard-sidebar fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-[#bfc9c3]/20 bg-surface-card dark:border-white/[0.08] dark:bg-[#0a0a0a] lg:flex"
                aria-label="Admin navigation"
            >
                <div className="flex h-full min-h-0 flex-col">
                    <NavContent {...props} />
                </div>
            </aside>

            {/* Mobile overlay */}
            {mobileOpen ? (
                <button
                    type="button"
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
                    aria-label="Close menu"
                    onClick={() => onMobileOpenChange(false)}
                />
            ) : null}

            {/* Mobile drawer */}
            <aside
                className={cn(
                    "dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%-2.5rem,19rem)] flex-col border-r border-[#bfc9c3]/20 bg-surface-card shadow-[4px_0_24px_-8px_rgba(0,0,0,0.15)] motion-safe:transition-transform motion-safe:duration-200 dark:border-white/[0.08] dark:bg-[#0a0a0a] lg:hidden",
                    mobileOpen ? "translate-x-0" : "pointer-events-none -translate-x-full"
                )}
                aria-hidden={!mobileOpen}
            >
                <div className="flex items-center justify-between border-b border-[#bfc9c3]/15 px-4 py-3 dark:border-white/[0.06]">
                    <Brand onNavigate={() => onMobileOpenChange(false)} />
                    <button
                        type="button"
                        onClick={() => onMobileOpenChange(false)}
                        className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#1a1a1a]"
                        aria-label="Close menu"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                    <NavContent
                        {...props}
                        showBrand={false}
                        onNavigate={() => onMobileOpenChange(false)}
                    />
                </div>
            </aside>
        </>
    );
}

export function CatalogAdminMobileMenuButton({
    onClick,
}: {
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex size-10 items-center justify-center rounded-xl border border-[#bfc9c3]/20 bg-white/50 text-muted-foreground shadow-sm transition-colors hover:border-[#006c49]/30 hover:text-[#006c49] dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-[#6ffbbe]/30 dark:hover:text-[#6ffbbe] lg:hidden"
            aria-label="Open menu"
        >
            <Menu className="size-5" />
        </button>
    );
}

export const TAB_META: Record<TabId, { title: string; description: string }> = {
    overview: {
        title: "Overview",
        description: "Platform health, tenant counts, and billing snapshot.",
    },
    shops: {
        title: "All Shops",
        description: "Browse tenants, products, subscriptions, and shop insights.",
    },
    subscriptions: {
        title: "Subscriptions",
        description: "Monitor plans, renewal dates, and past-due accounts.",
    },
    catalog: {
        title: "Product Catalog",
        description: "Hierarchical view of master catalog by shop type.",
    },
    products: {
        title: "Master Products",
        description: "Search and review synced products across all shops.",
    },
    "shop-types": {
        title: "Shop Types",
        description: "Product counts grouped by business category.",
    },
    categories: {
        title: "Categories",
        description: "Master catalog categories per shop type.",
    },
    "sync-logs": {
        title: "Sync Logs",
        description: "Recent master catalog sync and backfill activity.",
    },
};
