import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

export const dynamic = "force-dynamic";

const businessSelect = {
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    plan: businesses.plan,
    contactEmail: businesses.contactEmail,
    status: businesses.status,
    subscriptionStatus: businesses.subscriptionStatus,
    createdAt: businesses.createdAt,
} as const;

/**
 * List all businesses (paginated). Requires `X-Ventra-Platform-Key` only.
 * Optional query: `businessId` — narrows to the row with that id.
 */
export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;

    const idCond = businessId ? eq(businesses.id, businessId) : undefined;
    const [countRow] = idCond
        ? await db.select({ n: count() }).from(businesses).where(idCond)
        : await db.select({ n: count() }).from(businesses);

    const rows = idCond
        ? await db
              .select(businessSelect)
              .from(businesses)
              .where(idCond)
              .orderBy(desc(businesses.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(businessSelect)
              .from(businesses)
              .orderBy(desc(businesses.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({
        total: countRow?.n ?? 0,
        items: rows,
        limit,
        offset,
    });
}
