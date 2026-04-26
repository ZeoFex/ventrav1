import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { branches } from "@/server/db/schema/branches";

export const dynamic = "force-dynamic";

const row = {
    id: branches.id,
    businessId: branches.businessId,
    name: branches.name,
    code: branches.code,
    region: branches.region,
    address: branches.address,
    phone: branches.phone,
    isMain: branches.isMain,
    managerId: branches.managerId,
    status: branches.status,
    createdAt: branches.createdAt,
    updatedAt: branches.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(branches.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(branches).where(cond)
        : await db.select({ n: count() }).from(branches);

    const items = cond
        ? await db
              .select(row)
              .from(branches)
              .where(cond)
              .orderBy(desc(branches.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(branches)
              .orderBy(desc(branches.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
