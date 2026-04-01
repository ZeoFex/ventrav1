import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { createStaff, getStaffByBusiness } from "@/server/staff/staff-service";
import { z } from "zod";

const createStaffSchema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional().default(""),
    email: z.string().email(),
    phone: z.string().min(1),
    password: z.string().min(6),
    roleName: z.string().min(1),
    branchId: z.string().uuid(),
    permissionKeys: z.array(z.string()),
});

export async function GET(req: NextRequest) {
    try {
        const payload = await verifyAccessToken(req.cookies.get(COOKIE_NAMES.ACCESS)?.value || "");
        // Always return all staff for the business — client-side filtering handles branch view
        const staff = await getStaffByBusiness(payload.bid);
        return NextResponse.json(staff);
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const payload = await verifyAccessToken(req.cookies.get(COOKIE_NAMES.ACCESS)?.value || "");
        const body = await req.json();
        const parsed = createStaffSchema.parse(body);

        const result = await createStaff({
            businessId: payload.bid,
            branchId: parsed.branchId,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            email: parsed.email,
            phone: parsed.phone,
            passwordRaw: parsed.password,
            roleName: parsed.roleName,
            permissionKeys: parsed.permissionKeys,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("[POST /api/staff] Error:", error);
        return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
    }
}
