import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import {
    listRecentGlobalBarcodeLabels,
    searchGlobalBarcodeLabels,
} from "@/server/products/barcode-label-service";

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() ?? "";
        const recent = searchParams.get("recent") === "1";
        const limit = Number(searchParams.get("limit") ?? 40);

        if (recent) {
            const labels = await listRecentGlobalBarcodeLabels({
                limit: Math.min(limit, 24),
                viewerBusinessId: payload.bid,
            });
            return NextResponse.json(labels);
        }

        if (q.length < 2) {
            return NextResponse.json([]);
        }

        const labels = await searchGlobalBarcodeLabels(q, {
            limit,
            viewerBusinessId: payload.bid,
        });

        return NextResponse.json(labels);
    } catch (error) {
        console.error("GET /api/products/barcodes/catalog failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
