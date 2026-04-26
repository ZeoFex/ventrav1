import { asc, count, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { productTags, products } from "@/server/db/schema/products";

export const dynamic = "force-dynamic";

const join = eq(productTags.productId, products.id);

const row = {
    productId: productTags.productId,
    tagId: productTags.tagId,
    businessId: products.businessId,
} as const;

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
              .from(productTags)
              .innerJoin(products, join)
              .where(cond)
        : await db.select({ n: count() }).from(productTags);

    const items = cond
        ? await db
              .select(row)
              .from(productTags)
              .innerJoin(products, join)
              .where(cond)
              .orderBy(asc(productTags.productId), asc(productTags.tagId))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(productTags)
              .innerJoin(products, join)
              .orderBy(asc(productTags.productId), asc(productTags.tagId))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
