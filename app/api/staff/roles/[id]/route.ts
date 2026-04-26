import { NextRequest, NextResponse } from "next/server";
import { hasMinRole, requireUserAuth } from "@/server/auth/api-request-auth";
import { getRoleWithPermissions } from "@/server/staff/staff-service";

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
    const { id: roleId } = await params;

    const role = await getRoleWithPermissions(roleId, payload.bid);
    if (!role) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
}
