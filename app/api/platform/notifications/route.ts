import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema/notifications";

export const dynamic = "force-dynamic";

const row = {
    id: notifications.id,
    businessId: notifications.businessId,
    branchId: notifications.branchId,
    title: notifications.title,
    body: notifications.body,
    icon: notifications.icon,
    isRead: notifications.isRead,
    createdAt: notifications.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(notifications.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(notifications).where(cond)
        : await db.select({ n: count() }).from(notifications);

    const items = cond
        ? await db
              .select(row)
              .from(notifications)
              .where(cond)
              .orderBy(desc(notifications.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(notifications)
              .orderBy(desc(notifications.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
