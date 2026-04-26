import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { sales } from "@/server/db/schema/sales";

export const dynamic = "force-dynamic";

const row = {
    id: sales.id,
    businessId: sales.businessId,
    branchId: sales.branchId,
    invoiceId: sales.invoiceId,
    subtotalGhs: sales.subtotalGhs,
    taxGhs: sales.taxGhs,
    discountGhs: sales.discountGhs,
    totalGhs: sales.totalGhs,
    paymentMethod: sales.paymentMethod,
    itemCount: sales.itemCount,
    customerId: sales.customerId,
    userId: sales.userId,
    status: sales.status,
    createdAt: sales.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(sales.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(sales).where(cond)
        : await db.select({ n: count() }).from(sales);

    const items = cond
        ? await db
              .select(row)
              .from(sales)
              .where(cond)
              .orderBy(desc(sales.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(sales)
              .orderBy(desc(sales.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
