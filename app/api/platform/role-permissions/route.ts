import { asc, count, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { rolePermissions, roles } from "@/server/db/schema/roles";

export const dynamic = "force-dynamic";

const join = eq(rolePermissions.roleId, roles.id);

const row = {
    roleId: rolePermissions.roleId,
    permissionId: rolePermissions.permissionId,
    businessId: roles.businessId,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(roles.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db
              .select({ n: count() })
              .from(rolePermissions)
              .innerJoin(roles, join)
              .where(cond)
        : await db.select({ n: count() }).from(rolePermissions);

    const items = cond
        ? await db
              .select(row)
              .from(rolePermissions)
              .innerJoin(roles, join)
              .where(cond)
              .orderBy(asc(rolePermissions.roleId), asc(rolePermissions.permissionId))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(rolePermissions)
              .innerJoin(roles, join)
              .orderBy(asc(rolePermissions.roleId), asc(rolePermissions.permissionId))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
