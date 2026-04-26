import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema/audit-logs";

export const dynamic = "force-dynamic";

const row = {
    id: auditLogs.id,
    userId: auditLogs.userId,
    businessId: auditLogs.businessId,
    action: auditLogs.action,
    resource: auditLogs.resource,
    resourceId: auditLogs.resourceId,
    metadata: auditLogs.metadata,
    ipAddress: auditLogs.ipAddress,
    userAgent: auditLogs.userAgent,
    createdAt: auditLogs.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(auditLogs.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(auditLogs).where(cond)
        : await db.select({ n: count() }).from(auditLogs);

    const items = cond
        ? await db
              .select(row)
              .from(auditLogs)
              .where(cond)
              .orderBy(desc(auditLogs.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(auditLogs)
              .orderBy(desc(auditLogs.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
