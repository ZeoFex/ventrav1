import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireValidPlatformKeyOnly } from "@/server/auth/api-request-auth";
import { assertUserInBusiness, setPlatformUserStatus } from "@/server/platform/platform-user-write";
import { updateStaff } from "@/server/staff/staff-service";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { roles, userRoles } from "@/server/db/schema/roles";

export const dynamic = "force-dynamic";

const statusBody = z
    .object({
        businessId: z.string().uuid(),
        status: z.enum(["pending_verification", "active", "suspended", "deactivated"]),
    })
    .strict();

const fullBody = z
    .object({
        businessId: z.string().uuid(),
        firstName: z.string().min(1),
        lastName: z.string().optional().default(""),
        email: z.string().email(),
        phone: z.string().min(1),
        password: z.string().min(6).optional(),
        roleName: z.string().min(1),
        branchId: z.string().uuid(),
    })
    .strict();

function needBusinessId(req: NextRequest): string | null {
    return new URL(req.url).searchParams.get("businessId")?.trim() ?? null;
}

/** Single user with role + branch (same shape as GET /api/staff/[id]). */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const gate = requireValidPlatformKeyOnly(req);
    if (gate !== true) {
        return gate;
    }
    const businessId = needBusinessId(req);
    if (!businessId) {
        return NextResponse.json({ error: "Query businessId is required" }, { status: 400 });
    }
    const { id: userId } = await params;

    const result = await db
        .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            status: users.status,
            roleName: roles.name,
            branchId: userRoles.branchId,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(and(eq(users.id, userId), eq(users.businessId, businessId)))
        .limit(1);

    if (result.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const gate = requireValidPlatformKeyOnly(req);
    if (gate !== true) {
        return gate;
    }
    const { id: userId } = await params;
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const isFull =
        body !== null &&
        typeof body === "object" &&
        "firstName" in body &&
        typeof (body as { firstName?: string }).firstName === "string" &&
        (body as { firstName: string }).firstName.length > 0;

    if (isFull) {
        const f = fullBody.safeParse(body);
        if (!f.success) {
            return NextResponse.json(
                { error: "Invalid full update", details: f.error.flatten() },
                { status: 400 }
            );
        }
        if (!(await assertUserInBusiness(userId, f.data.businessId))) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        try {
            await updateStaff(userId, f.data.businessId, {
                firstName: f.data.firstName,
                lastName: f.data.lastName,
                email: f.data.email,
                phone: f.data.phone,
                passwordRaw: f.data.password,
                roleName: f.data.roleName,
                branchId: f.data.branchId,
            });
            return NextResponse.json({ success: true });
        } catch (e) {
            console.error("[PATCH /api/platform/users/[id]]", e);
            return NextResponse.json({ error: "Update failed" }, { status: 500 });
        }
    }

    const s = statusBody.safeParse(body);
    if (s.success) {
        const { updated } = await setPlatformUserStatus(userId, s.data.businessId, s.data.status);
        if (!updated) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    }

    return NextResponse.json(
        {
            error: "Body must be either { businessId, status } (suspend, etc.) or full staff update (firstName, email, phone, roleName, branchId, businessId, …).",
            details: s.error.flatten(),
        },
        { status: 400 }
    );
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const gate = requireValidPlatformKeyOnly(req);
    if (gate !== true) {
        return gate;
    }
    const businessId = needBusinessId(req);
    if (!businessId) {
        return NextResponse.json({ error: "Query businessId is required" }, { status: 400 });
    }
    const { id: userId } = await params;

    await db.delete(users).where(and(eq(users.id, userId), eq(users.businessId, businessId)));
    return NextResponse.json({ success: true });
}
