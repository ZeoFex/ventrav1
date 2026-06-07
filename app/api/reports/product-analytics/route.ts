import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getProductAnalytics } from "@/server/reports/product-analytics-service";

/**
 * GET /api/reports/product-analytics?productId=...&referenceDate=...
 * Returns per-product sales performance scoped to referenceDate periods (Accra timezone).
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get("productId");
        const referenceDate = searchParams.get("referenceDate");

        if (!productId) {
            return NextResponse.json({ error: "productId is required" }, { status: 400 });
        }

        const auth = await requireUserAuth(request);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const analytics = await getProductAnalytics(
            payload.bid,
            productId,
            branchId,
            referenceDate,
        );
        if (!analytics) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json(analytics, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/reports/product-analytics failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
