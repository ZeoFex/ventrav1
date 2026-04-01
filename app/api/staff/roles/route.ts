import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getBusinessRoles } from "@/server/staff/staff-service";

export async function GET(req: NextRequest) {
    try {
        const payload = await verifyAccessToken(req.cookies.get(COOKIE_NAMES.ACCESS)?.value || "");
        const roles = await getBusinessRoles(payload.bid);
        return NextResponse.json(roles);
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const payload = await verifyAccessToken(req.cookies.get(COOKIE_NAMES.ACCESS)?.value || "");
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
