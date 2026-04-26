import { NextRequest, NextResponse } from "next/server";
import {
    hasMinRole,
    requireOwner,
    requireUserAuth,
} from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema/users";
import { roles, userRoles } from "@/server/db/schema/roles";
import { eq, and } from "drizzle-orm";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    if (!hasMinRole(payload, "manager")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: staffId } = await params;

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
        .where(and(eq(users.id, staffId), eq(users.businessId, payload.bid)))
        .limit(1);

    if (result.length === 0) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const denied = requireOwner(payload);
        if (denied !== true) {
            return denied;
        }
        const { id: staffId } = await params;
        const body = await req.json();

        const { updateStaff } = await import("@/server/staff/staff-service");
        const result = await updateStaff(staffId, payload.bid, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error("[PATCH /api/staff/[id]] Error:", error);
        return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const denied = requireOwner(payload);
        if (denied !== true) {
            return denied;
        }
        const { id: staffId } = await params;

        await db.delete(users).where(and(eq(users.id, staffId), eq(users.businessId, payload.bid)));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
