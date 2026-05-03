/**
 * Cross-tenant counts for GET /api/platform/stats and GET /api/platform/overview.
 * Uses one SQL round-trip (scalar subselects) to avoid serverless timeouts from dozens of serial queries.
 */
import { db } from "@/server/db";

type CountRow = {
    businesses: bigint | string | number | null;
    users: bigint | string | number | null;
    branches: bigint | string | number | null;
    categories: bigint | string | number | null;
    tags: bigint | string | number | null;
    products: bigint | string | number | null;
    product_variations: bigint | string | number | null;
    product_tags: bigint | string | number | null;
    customers: bigint | string | number | null;
    sales: bigint | string | number | null;
    sale_items: bigint | string | number | null;
    expenses: bigint | string | number | null;
    discounts: bigint | string | number | null;
    notifications: bigint | string | number | null;
    reports: bigint | string | number | null;
    roles: bigint | string | number | null;
    permissions: bigint | string | number | null;
    role_permissions: bigint | string | number | null;
    user_roles: bigint | string | number | null;
    audit_logs: bigint | string | number | null;
    email_verifications: bigint | string | number | null;
    password_resets: bigint | string | number | null;
    pending_subscriptions: bigint | string | number | null;
    referral_qualifications: bigint | string | number | null;
};

function num(v: bigint | string | number | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "number") return v;
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
}

async function fetchAllCounts(businessId: string | undefined): Promise<CountRow> {
    const sql = db.$client;

    if (businessId) {
        const [row] = await sql<CountRow[]>`
            SELECT
                (SELECT COUNT(*)::bigint FROM businesses WHERE id = ${businessId}) AS businesses,
                (SELECT COUNT(*)::bigint FROM users WHERE business_id = ${businessId}) AS users,
                (SELECT COUNT(*)::bigint FROM branches WHERE business_id = ${businessId}) AS branches,
                (SELECT COUNT(*)::bigint FROM categories WHERE business_id = ${businessId}) AS categories,
                (SELECT COUNT(*)::bigint FROM tags WHERE business_id = ${businessId}) AS tags,
                (SELECT COUNT(*)::bigint FROM products WHERE business_id = ${businessId}) AS products,
                (SELECT COUNT(*)::bigint FROM product_variations pv
                    INNER JOIN products p ON p.id = pv.product_id
                    WHERE p.business_id = ${businessId}) AS product_variations,
                (SELECT COUNT(*)::bigint FROM product_tags pt
                    INNER JOIN products p ON p.id = pt.product_id
                    WHERE p.business_id = ${businessId}) AS product_tags,
                (SELECT COUNT(*)::bigint FROM customers WHERE business_id = ${businessId}) AS customers,
                (SELECT COUNT(*)::bigint FROM sales WHERE business_id = ${businessId}) AS sales,
                (SELECT COUNT(*)::bigint FROM sale_items si
                    INNER JOIN sales s ON s.id = si.sale_id
                    WHERE s.business_id = ${businessId}) AS sale_items,
                (SELECT COUNT(*)::bigint FROM expenses WHERE business_id = ${businessId}) AS expenses,
                (SELECT COUNT(*)::bigint FROM discounts WHERE business_id = ${businessId}) AS discounts,
                (SELECT COUNT(*)::bigint FROM notifications WHERE business_id = ${businessId}) AS notifications,
                (SELECT COUNT(*)::bigint FROM reports WHERE business_id = ${businessId}) AS reports,
                (SELECT COUNT(*)::bigint FROM roles WHERE business_id = ${businessId}) AS roles,
                (SELECT COUNT(*)::bigint FROM permissions) AS permissions,
                (SELECT COUNT(*)::bigint FROM role_permissions) AS role_permissions,
                (SELECT COUNT(*)::bigint FROM user_roles ur
                    INNER JOIN users u ON u.id = ur.user_id
                    WHERE u.business_id = ${businessId}) AS user_roles,
                (SELECT COUNT(*)::bigint FROM audit_logs WHERE business_id = ${businessId}) AS audit_logs,
                (SELECT COUNT(*)::bigint FROM email_verifications ev
                    INNER JOIN users u ON u.id = ev.user_id
                    WHERE u.business_id = ${businessId}) AS email_verifications,
                (SELECT COUNT(*)::bigint FROM password_resets pr
                    INNER JOIN users u ON u.id = pr.user_id
                    WHERE u.business_id = ${businessId}) AS password_resets,
                (SELECT COUNT(*)::bigint FROM pending_subscriptions) AS pending_subscriptions,
                (SELECT COUNT(*)::bigint FROM referral_qualifications
                    WHERE referrer_business_id = ${businessId} OR referee_business_id = ${businessId})
                    AS referral_qualifications
        `;
        if (!row) {
            throw new Error("platform stats: empty result");
        }
        return row;
    }

    const [row] = await sql<CountRow[]>`
        SELECT
            (SELECT COUNT(*)::bigint FROM businesses) AS businesses,
            (SELECT COUNT(*)::bigint FROM users) AS users,
            (SELECT COUNT(*)::bigint FROM branches) AS branches,
            (SELECT COUNT(*)::bigint FROM categories) AS categories,
            (SELECT COUNT(*)::bigint FROM tags) AS tags,
            (SELECT COUNT(*)::bigint FROM products) AS products,
            (SELECT COUNT(*)::bigint FROM product_variations) AS product_variations,
            (SELECT COUNT(*)::bigint FROM product_tags) AS product_tags,
            (SELECT COUNT(*)::bigint FROM customers) AS customers,
            (SELECT COUNT(*)::bigint FROM sales) AS sales,
            (SELECT COUNT(*)::bigint FROM sale_items) AS sale_items,
            (SELECT COUNT(*)::bigint FROM expenses) AS expenses,
            (SELECT COUNT(*)::bigint FROM discounts) AS discounts,
            (SELECT COUNT(*)::bigint FROM notifications) AS notifications,
            (SELECT COUNT(*)::bigint FROM reports) AS reports,
            (SELECT COUNT(*)::bigint FROM roles) AS roles,
            (SELECT COUNT(*)::bigint FROM permissions) AS permissions,
            (SELECT COUNT(*)::bigint FROM role_permissions) AS role_permissions,
            (SELECT COUNT(*)::bigint FROM user_roles) AS user_roles,
            (SELECT COUNT(*)::bigint FROM audit_logs) AS audit_logs,
            (SELECT COUNT(*)::bigint FROM email_verifications) AS email_verifications,
            (SELECT COUNT(*)::bigint FROM password_resets) AS password_resets,
            (SELECT COUNT(*)::bigint FROM pending_subscriptions) AS pending_subscriptions,
            (SELECT COUNT(*)::bigint FROM referral_qualifications) AS referral_qualifications
    `;
    if (!row) {
        throw new Error("platform stats: empty result");
    }
    return row;
}

/**
 * Counts for GET /api/platform/stats and GET /api/platform/overview.
 */
export async function getPlatformStatsCounts(businessId: string | undefined) {
    const r = await fetchAllCounts(businessId);
    return {
        filter: businessId ? { businessId } : null,
        counts: {
            businesses: num(r.businesses),
            users: num(r.users),
            branches: num(r.branches),
            categories: num(r.categories),
            tags: num(r.tags),
            products: num(r.products),
            productVariations: num(r.product_variations),
            productTags: num(r.product_tags),
            customers: num(r.customers),
            sales: num(r.sales),
            saleItems: num(r.sale_items),
            expenses: num(r.expenses),
            discounts: num(r.discounts),
            notifications: num(r.notifications),
            reports: num(r.reports),
            roles: num(r.roles),
            permissions: num(r.permissions),
            rolePermissions: num(r.role_permissions),
            userRoles: num(r.user_roles),
            auditLogs: num(r.audit_logs),
            emailVerifications: num(r.email_verifications),
            passwordResets: num(r.password_resets),
            pendingSubscriptions: num(r.pending_subscriptions),
            referralQualifications: num(r.referral_qualifications),
        },
    };
}
