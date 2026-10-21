import { db } from "../db";
import {
    activityActionLabel,
    platformResourceLabel,
} from "./platform-activity-labels";

export type ActivityFeedSource = "all" | "platform" | "shops";

export type ActivityFeedItem = {
    id: string;
    source: "platform" | "shop";
    action: string;
    actionLabel: string;
    resource: string;
    resourceLabel: string;
    resourceId: string | null;
    shopId: string | null;
    shopName: string | null;
    actorName: string | null;
    actorEmail: string | null;
    detail: string | null;
    createdAt: string;
};

type FeedRow = {
    id: string;
    source: string;
    action: string;
    resource: string;
    resource_id: string | null;
    shop_id: string | null;
    shop_name: string | null;
    actor_name: string | null;
    actor_email: string | null;
    detail: string | null;
    created_at: Date | string;
};

/**
 * Unified timeline: live shop records (sales, customers, products, …)
 * plus tenant audit logs and platform admin actions.
 */
export async function getPlatformActivityFeed(opts: {
    limit: number;
    offset: number;
    businessId?: string;
    q?: string;
    source?: ActivityFeedSource;
}): Promise<{ total: number; items: ActivityFeedItem[] }> {
    const sql = db.$client;
    const biz = opts.businessId ?? null;
    const q = opts.q?.trim() ? `%${opts.q.trim().replace(/[%_]/g, "")}%` : null;
    const src =
        opts.source === "platform" ? "platform" : opts.source === "shops" ? "shop" : null;

    const feed = sql`
        SELECT * FROM (
            SELECT
                ('sale:' || s.id::text) AS id,
                'shop'::text AS source,
                'shop.sale.completed'::text AS action,
                'sales'::text AS resource,
                s.id::text AS resource_id,
                s.business_id AS shop_id,
                b.name AS shop_name,
                nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), '') AS actor_name,
                u.email AS actor_email,
                ('Invoice ' || s.invoice_id || ' · GHS ' || s.total_ghs
                    || ' · ' || coalesce(c.name, 'Walk-in')
                    || ' · ' || replace(s.status::text, '_', ' ')) AS detail,
                s.created_at
            FROM sales s
            INNER JOIN businesses b ON b.id = s.business_id
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN customers c ON c.id = s.customer_id

            UNION ALL
            SELECT
                ('customer:' || cu.id::text),
                'shop',
                'shop.customer.saved',
                'customer',
                cu.id::text,
                cu.business_id,
                b.name,
                NULL,
                NULL,
                (cu.name || coalesce(' · ' || cu.phone, '')),
                cu.created_at::timestamptz
            FROM customers cu
            INNER JOIN businesses b ON b.id = cu.business_id

            UNION ALL
            SELECT
                ('payment:' || e.id::text),
                'shop',
                'shop.customer.payment',
                'customer',
                e.customer_id::text,
                e.business_id,
                b.name,
                NULL,
                NULL,
                (cu.name || ' paid GHS ' || e.amount_ghs
                    || coalesce(' · ' || e.note, '')),
                e.created_at
            FROM customer_account_entries e
            INNER JOIN businesses b ON b.id = e.business_id
            INNER JOIN customers cu ON cu.id = e.customer_id
            WHERE e.kind = 'payment_received'

            UNION ALL
            SELECT
                ('product:' || p.id::text),
                'shop',
                'shop.product.added',
                'product',
                p.id::text,
                p.business_id,
                b.name,
                NULL,
                NULL,
                (p.name || coalesce(' · ' || p.sku, '')),
                p.created_at
            FROM products p
            INNER JOIN businesses b ON b.id = p.business_id

            UNION ALL
            SELECT
                ('expense:' || e.id::text),
                'shop',
                'shop.expense.recorded',
                'expense',
                e.id::text,
                e.business_id,
                b.name,
                NULL,
                NULL,
                (e.description || ' · GHS ' || e.amount_ghs || coalesce(' · ' || e.vendor, '')),
                e.created_at
            FROM expenses e
            INNER JOIN businesses b ON b.id = e.business_id

            UNION ALL
            SELECT
                ('return:' || r.id::text),
                'shop',
                'shop.return.recorded',
                'return',
                r.id::text,
                r.business_id,
                b.name,
                nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''),
                u.email,
                (r.quantity::text || ' unit(s) returned'),
                r.created_at
            FROM sale_return_events r
            INNER JOIN businesses b ON b.id = r.business_id
            LEFT JOIN users u ON u.id = r.user_id

            UNION ALL
            SELECT
                ('stocktake:' || st.id::text),
                'shop',
                'shop.stock_take.completed',
                'stock_take',
                st.id::text,
                st.business_id,
                b.name,
                nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''),
                u.email,
                coalesce(st.note, 'Stock take ' || st.status::text),
                coalesce(st.completed_at, st.created_at)
            FROM stock_take_sessions st
            INNER JOIN businesses b ON b.id = st.business_id
            LEFT JOIN users u ON u.id = st.user_id
            WHERE st.status = 'completed'

            UNION ALL
            SELECT
                ('corder:' || o.id::text),
                'shop',
                'shop.customer_order.created',
                'customer_order',
                o.id::text,
                o.business_id,
                b.name,
                nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''),
                u.email,
                (o.invoice_id || ' · ' || replace(o.status::text, '_', ' ') || ' · GHS ' || o.total_ghs),
                o.created_at
            FROM customer_orders o
            INNER JOIN businesses b ON b.id = o.business_id
            LEFT JOIN users u ON u.id = o.user_id

            UNION ALL
            SELECT
                ('supply:' || so.id::text),
                'shop',
                'shop.supply.recorded',
                'supply',
                so.id::text,
                so.business_id,
                b.name,
                NULL,
                NULL,
                (so.reference || ' · GHS ' || so.total_cost_ghs),
                so.created_at
            FROM supply_orders so
            INNER JOIN businesses b ON b.id = so.business_id

            UNION ALL
            SELECT
                ('staff:' || us.id::text),
                'shop',
                'shop.staff.added',
                'staff',
                us.id::text,
                us.business_id,
                b.name,
                nullif(trim(coalesce(us.first_name, '') || ' ' || coalesce(us.last_name, '')), ''),
                us.email,
                us.email,
                us.created_at
            FROM users us
            INNER JOIN businesses b ON b.id = us.business_id

            UNION ALL
            SELECT
                ('audit:' || a.id::text),
                'shop',
                a.action,
                coalesce(a.resource, 'shop'),
                a.resource_id,
                a.business_id,
                b.name,
                nullif(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ''),
                u.email,
                coalesce(
                    NULLIF(a.metadata->>'detail', ''),
                    NULLIF(a.metadata->>'summary', '')
                ),
                a.created_at
            FROM audit_logs a
            LEFT JOIN businesses b ON b.id = a.business_id
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.action NOT IN (
                'shop.sale.completed',
                'shop.customer.saved',
                'shop.product.added',
                'shop.expense.recorded',
                'shop.return.recorded',
                'shop.stock_take.completed',
                'shop.customer_order.created',
                'shop.supply.recorded',
                'shop.staff.added',
                'shop.customer.payment'
            )

            UNION ALL
            SELECT
                ('platform:' || l.id::text),
                'platform',
                l.action,
                coalesce(l.resource, 'platform'),
                l.resource_id,
                CASE
                    WHEN (l.metadata->>'shopId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                        THEN (l.metadata->>'shopId')::uuid
                    WHEN l.resource IN ('business', 'sales', 'products')
                         AND l.resource_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                        THEN l.resource_id::uuid
                    ELSE NULL
                END,
                NULLIF(l.metadata->>'shopName', ''),
                COALESCE(
                    NULLIF(l.metadata->>'actorName', ''),
                    nullif(trim(coalesce(sa.first_name, '') || ' ' || coalesce(sa.last_name, '')), ''),
                    sa.email,
                    'Platform'
                ),
                COALESCE(l.metadata->>'actorEmail', sa.email),
                NULL,
                l.created_at
            FROM superadmin_audit_logs l
            LEFT JOIN superadmins sa ON sa.id = l.superadmin_id
        ) feed
    `;

    const filtered = sql`
        SELECT * FROM (${feed}) f
        WHERE (${biz}::uuid IS NULL OR f.shop_id = ${biz}::uuid)
          AND (${src}::text IS NULL OR f.source = ${src})
          AND (
            ${q}::text IS NULL
            OR f.action ILIKE ${q}
            OR coalesce(f.shop_name, '') ILIKE ${q}
            OR coalesce(f.actor_name, '') ILIKE ${q}
            OR coalesce(f.detail, '') ILIKE ${q}
            OR coalesce(f.resource, '') ILIKE ${q}
          )
    `;

    const [countRow] = await sql<{ n: string | number }[]>`
        SELECT count(*)::bigint AS n FROM (${filtered}) x
    `;

    const rows = await sql<FeedRow[]>`
        SELECT * FROM (${filtered}) x
        ORDER BY created_at DESC
        LIMIT ${opts.limit}
        OFFSET ${opts.offset}
    `;

    return {
        total: Number(countRow?.n ?? 0),
        items: rows.map((row) => ({
            id: row.id,
            source: row.source === "platform" ? "platform" : "shop",
            action: row.action,
            actionLabel: activityActionLabel(row.action),
            resource: row.resource,
            resourceLabel: platformResourceLabel(row.resource),
            resourceId: row.resource_id,
            shopId: row.shop_id,
            shopName: row.shop_name,
            actorName: row.actor_name,
            actorEmail: row.actor_email,
            detail: row.detail,
            createdAt:
                row.created_at instanceof Date
                    ? row.created_at.toISOString()
                    : String(row.created_at),
        })),
    };
}
