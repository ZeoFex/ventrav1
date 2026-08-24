/** Stable action keys written to `superadmin_audit_logs.action`. */
export const PLATFORM_ACTIONS = {
    ADMIN_SIGNED_IN: "admin.signed_in",
    ADMIN_ACCOUNT_CREATED: "admin.account.created",
    ADMIN_ACCOUNT_UPDATED: "admin.account.updated",
    ADMIN_TEAM_UPDATED: "admin.team.updated",
    ADMIN_TEAM_REMOVED: "admin.team.removed",
    SHOP_UPDATED: "shop.updated",
    SHOP_DELETED: "shop.deleted",
    SHOP_SALES_DELETED: "shop.sales.deleted",
    SHOP_SALES_CLEARED: "shop.sales.cleared",
    SHOP_PRODUCTS_DELETED: "shop.products.deleted",
    SHOP_PRODUCTS_CLEARED: "shop.products.cleared",
    SHOP_PRODUCT_ADDED: "shop.product.added",
    SHOP_BRANCH_ADDED: "shop.branch.added",
    CATALOG_PRODUCT_CREATED: "catalog.product.created",
    CATALOG_PRODUCT_UPDATED: "catalog.product.updated",
    CATALOG_PRODUCT_DELETED: "catalog.product.deleted",
    CATALOG_SYNCED: "catalog.synced",
    REVIEW_REMOVED: "review.removed",
} as const;

export type PlatformAction = (typeof PLATFORM_ACTIONS)[keyof typeof PLATFORM_ACTIONS];

const PLATFORM_ACTION_LABELS: Record<string, string> = {
    [PLATFORM_ACTIONS.ADMIN_SIGNED_IN]: "Signed in",
    [PLATFORM_ACTIONS.ADMIN_ACCOUNT_CREATED]: "Created admin account",
    [PLATFORM_ACTIONS.ADMIN_ACCOUNT_UPDATED]: "Updated own account",
    [PLATFORM_ACTIONS.ADMIN_TEAM_UPDATED]: "Updated team member",
    [PLATFORM_ACTIONS.ADMIN_TEAM_REMOVED]: "Removed team member",
    [PLATFORM_ACTIONS.SHOP_UPDATED]: "Updated shop",
    [PLATFORM_ACTIONS.SHOP_DELETED]: "Deleted shop",
    [PLATFORM_ACTIONS.SHOP_SALES_DELETED]: "Deleted shop transactions",
    [PLATFORM_ACTIONS.SHOP_SALES_CLEARED]: "Cleared all shop transactions",
    [PLATFORM_ACTIONS.SHOP_PRODUCTS_DELETED]: "Deleted shop products",
    [PLATFORM_ACTIONS.SHOP_PRODUCTS_CLEARED]: "Cleared all shop products",
    [PLATFORM_ACTIONS.SHOP_PRODUCT_ADDED]: "Added product to shop",
    [PLATFORM_ACTIONS.SHOP_BRANCH_ADDED]: "Added shop branch",
    [PLATFORM_ACTIONS.CATALOG_PRODUCT_CREATED]: "Created catalog product",
    [PLATFORM_ACTIONS.CATALOG_PRODUCT_UPDATED]: "Updated catalog product",
    [PLATFORM_ACTIONS.CATALOG_PRODUCT_DELETED]: "Deleted catalog product",
    [PLATFORM_ACTIONS.CATALOG_SYNCED]: "Synced catalog from shops",
    [PLATFORM_ACTIONS.REVIEW_REMOVED]: "Removed review",
    // Legacy superadmin rows
    login: "Signed in",
    account_created: "Created admin account",
    account_updated: "Updated own account",
    admin_updated_account: "Updated team member",
    admin_deleted_account: "Removed team member",
};

const RESOURCE_LABELS: Record<string, string> = {
    superadmin: "Admin account",
    superadmin_auth: "Admin sign-in",
    business: "Shop",
    sales: "Transactions",
    products: "Products",
    product: "Product",
    branch: "Branch",
    catalog: "Catalog",
    review: "Review",
    customer: "Customer",
    customers: "Customers",
    expense: "Expense",
    staff: "Staff",
    return: "Return",
    stock_take: "Stock take",
    supply: "Supply order",
    customer_order: "Customer order",
    shop: "Shop",
    discount: "Discount",
    settings: "Shop settings",
    stock: "Stock",
    user: "Staff account",
};

const TENANT_ACTION_LABELS: Record<string, string> = {
    signup: "Shop signed up",
    login: "Staff signed in",
    staff_login: "Staff signed in",
    email_verified: "Email verified",
    email_verified_link: "Email verified",
    password_reset: "Password reset",
    onboarding_completed: "Onboarding completed",
    admin_branch_added: "Branch added by platform",
    "shop.sale.completed": "Sale completed",
    "shop.customer.saved": "Customer saved",
    "shop.customer.updated": "Customer updated",
    "shop.customer.payment": "Customer payment",
    "shop.product.added": "Product added",
    "shop.product.updated": "Product updated",
    "shop.product.deleted": "Product deleted",
    "shop.stock.adjusted": "Stock adjusted",
    "shop.expense.recorded": "Expense recorded",
    "shop.return.recorded": "Sale return recorded",
    "shop.stock_take.completed": "Stock take completed",
    "shop.customer_order.created": "Customer order created",
    "shop.customer_order.finalized": "Customer order collected",
    "shop.supply.recorded": "Supply order recorded",
    "shop.staff.added": "Staff account created",
    "shop.staff.updated": "Staff account updated",
    "shop.staff.removed": "Staff account removed",
    "shop.settings.updated": "Shop settings updated",
    "shop.discount.created": "Discount created",
};

const SYNC_ACTION_LABELS: Record<string, string> = {
    created: "Created",
    updated: "Updated",
    sync: "Synced",
    bulk_sync: "Bulk sync",
    manual_create: "Created manually",
    manual_update: "Updated manually",
    manual_delete: "Deleted manually",
};

function titleFromKey(key: string): string {
    return key
        .replace(/[._]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function platformActionLabel(action: string | null | undefined): string {
    if (!action) return "Activity";
    return PLATFORM_ACTION_LABELS[action] ?? titleFromKey(action);
}

export function platformResourceLabel(resource: string | null | undefined): string {
    if (!resource) return "—";
    return RESOURCE_LABELS[resource] ?? titleFromKey(resource);
}

export function activityActionLabel(action: string | null | undefined): string {
    if (!action) return "Activity";
    return TENANT_ACTION_LABELS[action] ?? PLATFORM_ACTION_LABELS[action] ?? titleFromKey(action);
}

export function tenantAuditActionLabel(action: string | null | undefined): string {
    return activityActionLabel(action);
}

export function catalogSyncActionLabel(action: string | null | undefined): string {
    if (!action) return "—";
    return SYNC_ACTION_LABELS[action] ?? titleFromKey(action);
}
