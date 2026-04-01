import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getBusinessConfig, updateBusinessConfig } from "@/server/businesses/business-service";

/**
 * GET /api/business
 * Retrieves full business profile.
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
        return NextResponse.json(config);
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PATCH /api/business
 * Updates business profile details.
 */
export async function PATCH(req: Request) {
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

        const body = await req.json();

        // Simple update - in production, add Zod validation here
        await updateBusinessConfig(payload.bid, body);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("API Error [Business PATCH]:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
