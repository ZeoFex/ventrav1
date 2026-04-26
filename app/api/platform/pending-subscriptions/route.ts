import { count, desc } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { pendingSubscriptions } from "@/server/db/schema/pending-subscriptions";

export const dynamic = "force-dynamic";

const row = {
    id: pendingSubscriptions.id,
    email: pendingSubscriptions.email,
    plan: pendingSubscriptions.plan,
    cycle: pendingSubscriptions.cycle,
    reference: pendingSubscriptions.reference,
    status: pendingSubscriptions.status,
    amount: pendingSubscriptions.amount,
    createdAt: pendingSubscriptions.createdAt,
    updatedAt: pendingSubscriptions.updatedAt,
} as const;

/** Pre-signup Paystack handoffs (no per-business id). `businessId` query is ignored. */
export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset } = g.params;

    const [countRow] = await db.select({ n: count() }).from(pendingSubscriptions);
    const items = await db
        .select(row)
        .from(pendingSubscriptions)
        .orderBy(desc(pendingSubscriptions.createdAt))
        .limit(limit)
        .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
