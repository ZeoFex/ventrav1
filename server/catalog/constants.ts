import type { BusinessTypeId } from "@/app/components/onboarding/types";

/** Canonical shop types from VentraPOS onboarding + extensions for catalog grouping. */
export const MASTER_CATALOG_SHOP_TYPES: {
    id: string;
    label: string;
}[] = [
    { id: "pharmacy", label: "Pharmacy" },
    { id: "retail", label: "Retail Shop" },
    { id: "electronics", label: "Electronics" },
    { id: "agro_chemicals", label: "Agro Chemicals" },
    { id: "supermarket", label: "Supermarket" },
    { id: "mini_mart", label: "Mini Mart" },
    { id: "boutique", label: "Boutique" },
    { id: "cold_store", label: "Cold Store" },
    { id: "building_construction", label: "Building & Construction" },
    { id: "other", label: "Other" },
];

export const UNCATEGORIZED_LABEL = "Uncategorized";

export function normalizeCatalogText(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugifyCatalog(value: string): string {
    return normalizeCatalogText(value)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 200) || "item";
}

export function resolveShopType(raw: string | null | undefined): string {
    const v = (raw ?? "").trim();
    if (!v) return "other";
    const known = MASTER_CATALOG_SHOP_TYPES.find(
        (t) => t.id === v || normalizeCatalogText(t.label) === normalizeCatalogText(v)
    );
    return known?.id ?? v;
}

export function shopTypeLabel(id: string): string {
    const hit = MASTER_CATALOG_SHOP_TYPES.find((t) => t.id === id);
    return hit?.label ?? id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isKnownBusinessTypeId(id: string): id is BusinessTypeId {
    return [
        "retail",
        "agro_chemicals",
        "pharmacy",
        "supermarket",
        "mini_mart",
        "boutique",
        "electronics",
        "cold_store",
        "other",
    ].includes(id);
}
