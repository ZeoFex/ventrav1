import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { userRoles } from "@/server/db/schema/roles";
import { users } from "@/server/db/schema/users";

export const dynamic = "force-dynamic";

const join = eq(userRoles.userId, users.id);

const row = {
    id: userRoles.id,
    userId: userRoles.userId,
    roleId: userRoles.roleId,
    branchId: userRoles.branchId,
    assignedAt: userRoles.assignedAt,
    businessId: users.businessId,
} as const;

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
              .from(userRoles)
              .innerJoin(users, join)
              .where(cond)
        : await db.select({ n: count() }).from(userRoles);

    const items = cond
        ? await db
              .select(row)
              .from(userRoles)
              .innerJoin(users, join)
              .where(cond)
              .orderBy(desc(userRoles.assignedAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(userRoles)
              .innerJoin(users, join)
              .orderBy(desc(userRoles.assignedAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
