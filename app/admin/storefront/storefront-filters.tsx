"use client";

import { useState, type ReactNode } from "react";
import {
    Check,
    ChevronDown,
    LayoutGrid,
    Search,
    Store,
    Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StorefrontFilterMeta = {
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

export function StorefrontFilters({
    q,
    setQ,
    shopId,
    setShopId,
    shopType,
    setShopType,
    category,
    setCategory,
    meta,
    hasFilters,
    clearFilters,
    resultCount,
    signOut,
}: {
    q: string;
    setQ: (v: string) => void;
    shopId: string;
    setShopId: (v: string) => void;
    shopType: string;
    setShopType: (v: string) => void;
    category: string;
    setCategory: (v: string) => void;
    meta: StorefrontFilterMeta | null;
    hasFilters: boolean;
    clearFilters: () => void;
    resultCount: number;
    signOut: () => void;
}) {
    return (
        <div className="overflow-hidden rounded-[1.75rem] border border-[#e7e0d4] bg-white shadow-[0_18px_50px_-32px_rgba(31,61,50,0.55)] dark:border-white/10 dark:bg-[#141414]">
            <div className="bg-[#1f3d32] px-5 py-4 text-[#f4f1ea] dark:bg-[#143126]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#cde7d8]">
                    Refine
                </p>
                <div className="mt-1 flex items-end justify-between gap-3">
                    <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                        {resultCount.toLocaleString()}{" "}
                        <span className="text-base font-normal text-[#cde7d8]">
                            {resultCount === 1 ? "product" : "products"}
                        </span>
                    </p>
                    {hasFilters ? (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="shrink-0 text-xs font-medium text-[#f0c9b0] hover:underline"
                        >
                            Clear all
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="p-4">
                <label className="relative block">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8a8478]" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search products, SKU…"
                        className="w-full rounded-2xl border border-[#e7e0d4] bg-[#f7f4ee] py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-[#a39d90] focus:border-[#1f3d32] focus:bg-white dark:border-white/10 dark:bg-white/5 dark:focus:bg-white/10"
                    />
                </label>

                <FilterGroup
                    title="Shop type"
                    icon={<LayoutGrid className="size-3.5" />}
                    defaultOpen
                >
                    <div className="flex flex-wrap gap-1.5">
                        <TypeChip
                            active={!shopType}
                            onClick={() => setShopType("")}
                            label="All"
                        />
                        {meta?.shopTypes.map((t) => (
                            <TypeChip
                                key={t.id}
                                active={shopType === t.id}
                                onClick={() => setShopType(shopType === t.id ? "" : t.id)}
                                label={t.label}
                                count={t.productCount}
                            />
                        ))}
                    </div>
                </FilterGroup>

                <FilterGroup
                    title="Shop"
                    icon={<Store className="size-3.5" />}
                    count={meta?.shops.length}
                    defaultOpen
                >
                    <FilterRow
                        active={!shopId}
                        onClick={() => setShopId("")}
                        label="All shops"
                    />
                    {meta?.shops.map((s) => (
                        <FilterRow
                            key={s.id}
                            active={shopId === s.id}
                            onClick={() => setShopId(shopId === s.id ? "" : s.id)}
                            label={s.name}
                            hint={s.city}
                            count={s.productCount}
                        />
                    ))}
                </FilterGroup>

                <FilterGroup
                    title="Category"
                    icon={<Tag className="size-3.5" />}
                    count={meta?.categories.length}
                    defaultOpen
                >
                    <FilterRow
                        active={!category}
                        onClick={() => setCategory("")}
                        label="All categories"
                    />
                    {meta?.categories.map((c) => (
                        <FilterRow
                            key={c.name}
                            active={category === c.name}
                            onClick={() => setCategory(category === c.name ? "" : c.name)}
                            label={c.name}
                            count={c.count}
                        />
                    ))}
                </FilterGroup>
            </div>

            <div className="border-t border-[#e7e0d4] px-4 py-3 dark:border-white/10">
                <button
                    type="button"
                    onClick={signOut}
                    className="w-full rounded-xl py-2 text-xs font-medium text-[#8a8478] transition hover:bg-[#f7f4ee] hover:text-[#1c1917] dark:hover:bg-white/5 dark:hover:text-zinc-200"
                >
                    Sign out of admin preview
                </button>
            </div>
        </div>
    );
}

function FilterGroup({
    title,
    icon,
    count,
    defaultOpen,
    children,
}: {
    title: string;
    icon: ReactNode;
    count?: number;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen ?? true);

    return (
        <div className="mt-4 border-t border-[#efe8dc] pt-3 dark:border-white/10">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 py-1 text-left"
            >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#f4f1ea] text-[#1f3d32] dark:bg-white/5 dark:text-[#6ffbbe]">
                    {icon}
                </span>
                <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b6560]">
                    {title}
                </span>
                {count != null ? (
                    <span className="rounded-full bg-[#f4f1ea] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[#8a8478] dark:bg-white/5">
                        {count}
                    </span>
                ) : null}
                <ChevronDown
                    className={cn(
                        "size-4 text-[#8a8478] transition",
                        open ? "rotate-0" : "-rotate-90",
                    )}
                />
            </button>
            {open ? <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1">{children}</div> : null}
        </div>
    );
}

function TypeChip({
    label,
    count,
    active,
    onClick,
}: {
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
                active
                    ? "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                    : "bg-[#f4f1ea] text-[#5c574e] hover:bg-[#efe8dc] dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10",
            )}
        >
            {label}
            {count != null ? (
                <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-50")}>
                    {count}
                </span>
            ) : null}
        </button>
    );
}

function FilterRow({
    label,
    hint,
    count,
    active,
    onClick,
}: {
    label: string;
    hint?: string | null;
    count?: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition",
                active
                    ? "bg-[#1f3d32] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                    : "text-[#5c574e] hover:bg-[#f7f4ee] dark:text-zinc-300 dark:hover:bg-white/5",
            )}
        >
            <span
                className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    active
                        ? "border-white bg-white text-[#1f3d32] dark:border-[#003527] dark:bg-[#003527] dark:text-[#6ffbbe]"
                        : "border-[#d9d2c4] bg-transparent dark:border-white/20",
                )}
            >
                {active ? <Check className="size-2.5" strokeWidth={3} /> : null}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{label}</span>
                {hint ? (
                    <span className={cn("block truncate text-[11px]", active ? "opacity-70" : "text-[#8a8478]")}>
                        {hint}
                    </span>
                ) : null}
            </span>
            {count != null ? (
                <span className={cn("shrink-0 text-[11px] tabular-nums", active ? "opacity-80" : "opacity-45")}>
                    {count.toLocaleString()}
                </span>
            ) : null}
        </button>
    );
}
