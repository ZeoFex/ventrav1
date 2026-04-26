import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { productVariations, products } from "@/server/db/schema/products";

export const dynamic = "force-dynamic";

const row = {
    id: productVariations.id,
    productId: productVariations.productId,
    name: productVariations.name,
    type: productVariations.type,
    priceGhs: productVariations.priceGhs,
    stock: productVariations.stock,
    sku: productVariations.sku,
    barcode: productVariations.barcode,
    createdAt: productVariations.createdAt,
    updatedAt: productVariations.updatedAt,
    businessId: products.businessId,
} as const;

const join = eq(productVariations.productId, products.id);

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(products.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db
              .select({ n: count() })
              .from(productVariations)
              .innerJoin(products, join)
              .where(cond)
        : await db.select({ n: count() }).from(productVariations);

    const items = cond
        ? await db
              .select(row)
              .from(productVariations)
              .innerJoin(products, join)
              .where(cond)
              .orderBy(desc(productVariations.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(productVariations)
              .innerJoin(products, join)
              .orderBy(desc(productVariations.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
