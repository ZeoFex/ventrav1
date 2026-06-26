import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { suggestBarcodeProductsByName } from "@/server/products/barcode-suggest-service";

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() ?? "";
        const limit = Number(searchParams.get("limit") ?? 8);

        if (q.length < 2) {
            return NextResponse.json([]);
        }

        const suggestions = await suggestBarcodeProductsByName(q, {
            limit,
            viewerBusinessId: payload.bid,
        });

        return NextResponse.json(suggestions);
    } catch (error) {
        console.error("GET /api/barcodes/suggest failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
