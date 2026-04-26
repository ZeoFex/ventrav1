import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { passwordResets } from "@/server/db/schema/password-resets";
import { users } from "@/server/db/schema/users";

export const dynamic = "force-dynamic";

const join = eq(passwordResets.userId, users.id);

const row = {
    id: passwordResets.id,
    userId: passwordResets.userId,
    expiresAt: passwordResets.expiresAt,
    isUsed: passwordResets.isUsed,
    createdAt: passwordResets.createdAt,
    businessId: users.businessId,
} as const;

/** Reset rows (no `token` / `tokenHash`). */
export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(users.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db
              .select({ n: count() })
              .from(passwordResets)
              .innerJoin(users, join)
              .where(cond)
        : await db.select({ n: count() }).from(passwordResets);

    const items = cond
        ? await db
              .select(row)
              .from(passwordResets)
              .innerJoin(users, join)
              .where(cond)
              .orderBy(desc(passwordResets.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(passwordResets)
              .innerJoin(users, join)
              .orderBy(desc(passwordResets.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
