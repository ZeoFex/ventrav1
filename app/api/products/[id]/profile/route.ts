import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getProductProfile } from "@/server/products/product-profile-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const branchId = await getActiveBranchIdFromContext();
        const profile = await getProductProfile(payload.bid, id, branchId);
        if (!profile) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        return NextResponse.json(profile, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("GET /api/products/[id]/profile failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
