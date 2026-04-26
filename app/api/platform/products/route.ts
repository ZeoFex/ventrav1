import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { products } from "@/server/db/schema/products";

export const dynamic = "force-dynamic";

const row = {
    id: products.id,
    businessId: products.businessId,
    categoryId: products.categoryId,
    branchId: products.branchId,
    name: products.name,
    slug: products.slug,
    sku: products.sku,
    barcode: products.barcode,
    description: products.description,
    imageSrc: products.imageSrc,
    priceGhs: products.priceGhs,
    costPriceGhs: products.costPriceGhs,
    stock: products.stock,
    reorderAt: products.reorderAt,
    trackInventory: products.trackInventory,
    unit: products.unit,
    status: products.status,
    createdAt: products.createdAt,
    updatedAt: products.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(products.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(products).where(cond)
        : await db.select({ n: count() }).from(products);

    const items = cond
        ? await db
              .select(row)
              .from(products)
              .where(cond)
              .orderBy(desc(products.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(products)
              .orderBy(desc(products.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
