import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getCustomerProfile } from "@/server/customers/customer-profile-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const profile = await getCustomerProfile(payload.bid, id);
        if (!profile) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }
        return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("GET /api/customers/[id]/profile failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
