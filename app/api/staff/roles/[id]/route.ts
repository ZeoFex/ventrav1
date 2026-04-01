import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getRoleWithPermissions } from "@/server/staff/staff-service";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await verifyAccessToken(req.cookies.get(COOKIE_NAMES.ACCESS)?.value || "");
        const { id: roleId } = await params;

        const role = await getRoleWithPermissions(roleId, payload.bid);
        if (!role) {
            return NextResponse.json({ error: "Role not found" }, { status: 404 });
        }

        return NextResponse.json(role);
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
