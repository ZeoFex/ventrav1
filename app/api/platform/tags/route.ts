import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { tags } from "@/server/db/schema/products";

export const dynamic = "force-dynamic";

const row = {
    id: tags.id,
    businessId: tags.businessId,
    branchId: tags.branchId,
    name: tags.name,
    color: tags.color,
    createdAt: tags.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(tags.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(tags).where(cond)
        : await db.select({ n: count() }).from(tags);

    const items = cond
        ? await db
              .select(row)
              .from(tags)
              .where(cond)
              .orderBy(desc(tags.createdAt))
              .limit(limit)
              .offset(offset)
        : await db.select(row).from(tags).orderBy(desc(tags.createdAt)).limit(limit).offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
