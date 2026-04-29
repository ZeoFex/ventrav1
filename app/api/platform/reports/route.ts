import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { reports } from "@/server/db/schema/reports";

export const dynamic = "force-dynamic";

const row = {
    id: reports.id,
    businessId: reports.businessId,
    reportDate: reports.reportDate,
    type: reports.type,
    stats: reports.stats,
    status: reports.status,
    errorMessage: reports.errorMessage,
    createdAt: reports.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(reports.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(reports).where(cond)
        : await db.select({ n: count() }).from(reports);

    const items = cond
        ? await db
              .select(row)
              .from(reports)
              .where(cond)
              .orderBy(desc(reports.reportDate))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(reports)
              .orderBy(desc(reports.reportDate))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
