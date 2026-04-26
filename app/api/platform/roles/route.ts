import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { roles } from "@/server/db/schema/roles";

export const dynamic = "force-dynamic";

const row = {
    id: roles.id,
    businessId: roles.businessId,
    name: roles.name,
    isSystem: roles.isSystem,
    createdAt: roles.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(roles.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(roles).where(cond)
        : await db.select({ n: count() }).from(roles);

    const items = cond
        ? await db
              .select(row)
              .from(roles)
              .where(cond)
              .orderBy(desc(roles.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(roles)
              .orderBy(desc(roles.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
