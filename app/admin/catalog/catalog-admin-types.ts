import type { LucideIcon } from "lucide-react";
import {
    Building2,
    CreditCard,
    FolderTree,
    LayoutDashboard,
    LayoutGrid,
    Layers3,
    MessageSquareQuote,
    Package,
    ScrollText,
    Store,
    StoreIcon,
} from "lucide-react";

export type TabId =
    | "overview"
    | "shops"
    | "subscriptions"
    | "reviews"
    | "catalog"
    | "categories"
    | "products"
    | "shop-types"
    | "sync-logs";

export type BusinessPlan = "starter" | "growth" | "pro";
export type BusinessStatus = "active" | "suspended" | "deactivated";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

export type PlatformNotificationType =
    | "shop_created"
    | "shop_onboarded"
    | "subscription_past_due"
    | "subscription_expiring"
    | "product_added"
    | "products_bulk_added";

export type PlatformNotification = {
    id: string;
    type: PlatformNotificationType;
    title: string;
    body: string;
    businessId: string | null;
    productId: string | null;
    metadata: Record<string, unknown> | null;
    isRead: boolean;
    createdAt: string;
};

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
    phone: string | null;
    contactEmail: string | null;
    registeredEmails: string[];
    productCount: number;
    branchCount: number;
    paidExtraBranches: number;
    plan: BusinessPlan;
    status: BusinessStatus;
    subscriptionStatus: SubscriptionStatus;
    currentPeriodEnd: string | null;
    createdAt: string;
    updatedAt: string;
    onboardingCompleted: boolean;
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
    stock: number;
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

export type ShopDetailTab = "products" | "subscription" | "insights";

export const TABS: { id: TabId; label: string; icon: LucideIcon; group?: string }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Platform" },
    { id: "shops", label: "All Shops", icon: StoreIcon, group: "Platform" },
    { id: "subscriptions", label: "Subscriptions", icon: CreditCard, group: "Platform" },
    { id: "reviews", label: "Reviews", icon: MessageSquareQuote, group: "Platform" },
    { id: "catalog", label: "Product Catalog", icon: LayoutGrid, group: "Catalog" },
    { id: "products", label: "Master Products", icon: Package, group: "Catalog" },
    { id: "shop-types", label: "Shop Types", icon: Store, group: "Catalog" },
    { id: "categories", label: "Categories", icon: FolderTree, group: "Catalog" },
    { id: "sync-logs", label: "Sync Logs", icon: ScrollText, group: "Catalog" },
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
