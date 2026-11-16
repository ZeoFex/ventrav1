import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { getCustomerProfile } from "@/server/customers/customer-profile-service";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { customers } from "@/server/db/schema/customers";
import { sales } from "@/server/db/schema/sales";

export const dynamic = "force-dynamic";

const uuidParam = z.string().uuid();

/**
 * GET /api/platform/businesses/[id]/customers
 * - Default: { customersCount }
 * - ?customerId=uuid → saved-customer profile + receipts for this shop
 * - ?list=1&limit=&offset=&q= → paginated saved customers with sale stats
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    const [biz] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
    if (!biz) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId")?.trim();
    const list = searchParams.get("list") === "1" || searchParams.get("list") === "true";

    if (customerId) {
        if (!uuidParam.safeParse(customerId).success) {
            return NextResponse.json({ error: "Invalid customer id" }, { status: 400 });
        }
        const profile = await getCustomerProfile(id, customerId);
        if (!profile) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        return NextResponse.json(profile);
    }

    if (list) {
        const limit = Math.min(
            200,
            Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50),
        );
        const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
        const q = searchParams.get("q")?.trim() ?? "";

        const conditions = [eq(customers.businessId, id)];
        if (q) {
            const safe = q.replace(/[%_]/g, "");
            if (safe) {
                const pattern = `%${safe}%`;
                conditions.push(
                    or(
                        ilike(customers.name, pattern),
                        ilike(customers.phone, pattern),
                        sql`coalesce(${customers.email}, '') ILIKE ${pattern}`,
                    )!,
                );
            }
        }

        const where = and(...conditions);
        const [countRow] = await db.select({ n: count() }).from(customers).where(where);
        const items = await db
            .select({
                id: customers.id,
                name: customers.name,
                phone: customers.phone,
                email: customers.email,
                status: customers.status,
                accountsReceivableGhs: customers.accountsReceivableGhs,
                createdAt: customers.createdAt,
                saleCount: sql<number>`coalesce(count(${sales.id}) filter (where ${sales.status} not in ('voided', 'refunded')), 0)::int`,
                spentGhs: sql<string>`coalesce(sum(${sales.totalGhs}::numeric) filter (where ${sales.status} not in ('voided', 'refunded')), 0)`,
                lastSaleAt: sql<string | null>`max(${sales.createdAt})`,
            })
            .from(customers)
            .leftJoin(
                sales,
                and(eq(sales.customerId, customers.id), eq(sales.businessId, id)),
            )
            .where(where)
            .groupBy(
                customers.id,
                customers.name,
                customers.phone,
                customers.email,
                customers.status,
                customers.accountsReceivableGhs,
                customers.createdAt,
            )
            .orderBy(desc(customers.createdAt))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            total: Number(countRow?.n ?? 0),
            items: items.map((row) => ({
                ...row,
                saleCount: Number(row.saleCount ?? 0),
                spentGhs: String(row.spentGhs ?? "0"),
                lastSaleAt: row.lastSaleAt
                    ? new Date(row.lastSaleAt).toISOString()
                    : null,
                createdAt:
                    row.createdAt instanceof Date
                        ? row.createdAt.toISOString()
                        : row.createdAt,
            })),
            limit,
            offset,
        });
    }

    const [stats] = await db
        .select({ total: count() })
        .from(customers)
        .where(eq(customers.businessId, id));

    return NextResponse.json({ customersCount: Number(stats?.total ?? 0) });
}
