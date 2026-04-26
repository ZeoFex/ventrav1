import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getBusinessConfig } from "@/server/businesses/business-service";

/**
 * GET /api/pos/config
 * Retrieves core business configuration for the POS (receipts, tax, currency).
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
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
