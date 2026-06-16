import type { LucideIcon } from "lucide-react";
import {
    Building2,
    FolderTree,
    LayoutGrid,
    Layers3,
    Package,
    ScrollText,
    Store,
    StoreIcon,
} from "lucide-react";

export type TabId =
    | "shops"
    | "shop-types"
    | "catalog"
    | "categories"
    | "products"
    | "sync-logs";

export type MasterProduct = {
    id: string;
    name: string;
    shopType: string;
    shopTypeLabel: string;
    categoryName: string;
    sku: string | null;
    barcode: string | null;
    imageSrc: string | null;
    unit: string | null;
    description: string | null;
    sourceBusinessId: string | null;
    sourceBusinessName: string | null;
    syncedAt: string;
    updatedAt: string;
};

export type ShopTypeRow = { id: string; label: string; productCount: number };

export type CatalogShop = {
    id: string;
    name: string;
    slug: string;
    shopType: string;
    shopTypeLabel: string;
    city: string | null;
    region: string | null;
    contactEmail: string | null;
    registeredEmails: string[];
    productCount: number;
};

export type ShopProduct = {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    imageSrc: string | null;
    categoryName: string;
    unit: string | null;
    priceGhs: string;
    status: string;
    businessId: string;
    businessName: string;
    shopType: string;
    shopTypeLabel: string;
};

export type MasterCategory = {
    id: string;
    shopType: string;
    name: string;
    slug: string;
    productCount: number;
};

export type SyncLog = {
    id: string;
    action: string;
    productName: string | null;
    shopType: string | null;
    status: string;
    message: string | null;
    createdAt: string;
};

export type HierarchyNode = {
    shopType: string;
    label: string;
    productCount: number;
    categories: {
        name: string;
        productCount: number;
        products: MasterProduct[];
    }[];
};

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
    { id: "shops", label: "All Shops", icon: StoreIcon },
    { id: "catalog", label: "Product Catalog", icon: LayoutGrid },
    { id: "products", label: "Master Products", icon: Package },
    { id: "shop-types", label: "Shop Types", icon: Store },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "sync-logs", label: "Sync Logs", icon: ScrollText },
];

export function shopTypeIcon(id: string): LucideIcon {
    switch (id) {
        case "pharmacy":
            return Package;
        case "electronics":
            return Layers3;
        case "supermarket":
        case "mini_mart":
        case "retail":
            return Store;
        default:
            return Building2;
    }
}
