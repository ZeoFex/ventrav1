import { asc, count } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { permissions } from "@/server/db/schema/roles";

export const dynamic = "force-dynamic";

const row = {
    id: permissions.id,
    key: permissions.key,
    label: permissions.label,
} as const;

/** Global permission catalog. No `businessId` filter (not tenant-scoped). */
export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset } = g.params;

    const [countRow] = await db.select({ n: count() }).from(permissions);
    const items = await db
        .select(row)
        .from(permissions)
        .orderBy(asc(permissions.key))
        .limit(limit)
        .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
