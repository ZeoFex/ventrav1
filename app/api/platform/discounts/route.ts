import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { discounts } from "@/server/db/schema/discounts";

export const dynamic = "force-dynamic";

const row = {
    id: discounts.id,
    businessId: discounts.businessId,
    branchId: discounts.branchId,
    name: discounts.name,
    type: discounts.type,
    value: discounts.value,
    isActive: discounts.isActive,
    autoApply: discounts.autoApply,
    minOrderValueGhs: discounts.minOrderValueGhs,
    startDate: discounts.startDate,
    endDate: discounts.endDate,
    createdAt: discounts.createdAt,
    updatedAt: discounts.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(discounts.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(discounts).where(cond)
        : await db.select({ n: count() }).from(discounts);

    const items = cond
        ? await db
              .select(row)
              .from(discounts)
              .where(cond)
              .orderBy(desc(discounts.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(discounts)
              .orderBy(desc(discounts.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
