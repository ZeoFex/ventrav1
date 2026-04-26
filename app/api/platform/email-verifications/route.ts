import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { emailVerifications } from "@/server/db/schema/email-verifications";
import { users } from "@/server/db/schema/users";

export const dynamic = "force-dynamic";

const join = eq(emailVerifications.userId, users.id);

const row = {
    id: emailVerifications.id,
    userId: emailVerifications.userId,
    attempts: emailVerifications.attempts,
    isUsed: emailVerifications.isUsed,
    createdAt: emailVerifications.createdAt,
    expiresAt: emailVerifications.expiresAt,
    businessId: users.businessId,
} as const;

/** OTP rows (no `code` / `codeHash`). */
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
              .from(emailVerifications)
              .innerJoin(users, join)
              .where(cond)
        : await db.select({ n: count() }).from(emailVerifications);

    const items = cond
        ? await db
              .select(row)
              .from(emailVerifications)
              .innerJoin(users, join)
              .where(cond)
              .orderBy(desc(emailVerifications.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(emailVerifications)
              .innerJoin(users, join)
              .orderBy(desc(emailVerifications.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
