import { NextRequest, NextResponse } from "next/server";
import { count, desc } from "drizzle-orm";
import { requireValidPlatformKeyOnly } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

export const dynamic = "force-dynamic";

/**
 * List all businesses (paginated). Requires `X-Ventra-Platform-Key` only (no act-as).
 */
export async function GET(req: NextRequest) {
    const gate = requireValidPlatformKeyOnly(req);
    if (gate !== true) {
        return gate;
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") ?? "200", 10) || 200));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);

    const [countRow] = await db
        .select({ n: count() })
        .from(businesses);

    const rows = await db
        .select({
            id: businesses.id,
            name: businesses.name,
            slug: businesses.slug,
            plan: businesses.plan,
            contactEmail: businesses.contactEmail,
            status: businesses.status,
            subscriptionStatus: businesses.subscriptionStatus,
            createdAt: businesses.createdAt,
        })
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
