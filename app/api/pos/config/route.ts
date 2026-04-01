import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getBusinessConfig } from "@/server/businesses/business-service";

/**
 * GET /api/pos/config
 * Retrieves core business configuration for the POS (receipts, tax, currency).
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        if (!payload.bid) {
            return NextResponse.json({ error: "No business associated" }, { status: 400 });
        }

        const config = await getBusinessConfig(payload.bid);
        if (!config) {
            return NextResponse.json({ error: "Business config not found" }, { status: 404 });
        }

        return NextResponse.json(config);
    } catch (err: any) {
        console.error("API Error [POS Config]:", err);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
