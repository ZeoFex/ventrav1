import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { createStaff } from "@/server/staff/staff-service";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";

export const dynamic = "force-dynamic";

const platformCreateUserSchema = z.object({
    businessId: z.string().uuid(),
    branchId: z.string().uuid(),
    firstName: z.string().min(1),
    lastName: z.string().optional().default(""),
    email: z.string().email(),
    phone: z.string().min(1),
    password: z.string().min(6),
    roleName: z.string().min(1),
    permissionKeys: z.array(z.string()).default([]),
});

const row = {
    id: users.id,
    businessId: users.businessId,
    email: users.email,
    emailNormalized: users.emailNormalized,
    firstName: users.firstName,
    lastName: users.lastName,
    phone: users.phone,
    emailVerified: users.emailVerified,
    status: users.status,
    lastLoginAt: users.lastLoginAt,
    avatarUrl: users.avatarUrl,
    city: users.city,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
} as const;

/**
 * All users (no password hash). Optional `businessId` filter.
 */
export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(users.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(users).where(cond)
        : await db.select({ n: count() }).from(users);

    const items = cond
        ? await db
              .select(row)
              .from(users)
              .where(cond)
              .orderBy(desc(users.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(users)
              .orderBy(desc(users.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}

/**
 * Create a user in any business (same rules as owner POST /api/staff).
 */
export async function POST(req: NextRequest) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) {
        return gate;
    }
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = platformCreateUserSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }
    const p = parsed.data;
    try {
        const result = await createStaff({
            businessId: p.businessId,
            branchId: p.branchId,
            firstName: p.firstName,
            lastName: p.lastName,
            email: p.email,
            phone: p.phone,
            passwordRaw: p.password,
            roleName: p.roleName,
            permissionKeys: p.permissionKeys,
        });
        return NextResponse.json(result, { status: 201 });
    } catch (e) {
        console.error("[POST /api/platform/users]", e);
        return NextResponse.json(
            { error: "Failed to create user (duplicate email or bad branch/role?)" },
            { status: 400 }
        );
    }
}
