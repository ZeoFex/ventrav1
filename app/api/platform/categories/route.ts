import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema/products";

export const dynamic = "force-dynamic";

const row = {
    id: categories.id,
    businessId: categories.businessId,
    branchId: categories.branchId,
    name: categories.name,
    slug: categories.slug,
    description: categories.description,
    createdAt: categories.createdAt,
    updatedAt: categories.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(categories.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(categories).where(cond)
        : await db.select({ n: count() }).from(categories);

    const items = cond
        ? await db
              .select(row)
              .from(categories)
              .where(cond)
              .orderBy(desc(categories.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(categories)
              .orderBy(desc(categories.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
