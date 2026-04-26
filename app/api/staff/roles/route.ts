import { NextRequest, NextResponse } from "next/server";
import { hasMinRole, requireUserAuth } from "@/server/auth/api-request-auth";
import { getBusinessRoles } from "@/server/staff/staff-service";

export async function GET(req: NextRequest) {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { payload } = auth;
    if (!hasMinRole(payload, "manager")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const roles = await getBusinessRoles(payload.bid);
    return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { name, permissionKeys } = await req.json();

        if (!name) return NextResponse.json({ error: "Role name is required" }, { status: 400 });

        const { saveBusinessRole } = await import("@/server/staff/staff-service");
        const role = await saveBusinessRole({
            businessId: payload.bid,
            name,
            permissionKeys: permissionKeys || [],
        });

        return NextResponse.json(role);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
