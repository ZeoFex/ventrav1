import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { saleItems, sales } from "@/server/db/schema/sales";

export const dynamic = "force-dynamic";

const join = eq(saleItems.saleId, sales.id);

const row = {
    id: saleItems.id,
    saleId: saleItems.saleId,
    productId: saleItems.productId,
    variationId: saleItems.variationId,
    productName: saleItems.productName,
    quantity: saleItems.quantity,
    quantityReturned: saleItems.quantityReturned,
    unitPriceGhs: saleItems.unitPriceGhs,
    lineTotalGhs: saleItems.lineTotalGhs,
    businessId: sales.businessId,
    saleCreatedAt: sales.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(sales.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db
              .select({ n: count() })
              .from(saleItems)
              .innerJoin(sales, join)
              .where(cond)
        : await db.select({ n: count() }).from(saleItems);

    const items = cond
        ? await db
              .select(row)
              .from(saleItems)
              .innerJoin(sales, join)
              .where(cond)
              .orderBy(desc(sales.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(saleItems)
              .innerJoin(sales, join)
              .orderBy(desc(sales.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
