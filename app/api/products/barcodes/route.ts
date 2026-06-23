import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import {
    createBarcodeLabel,
    listBarcodeLabels,
} from "@/server/products/barcode-label-service";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const labels = await listBarcodeLabels(payload.bid, branchId);
        return NextResponse.json(labels);
    } catch (error) {
        console.error("GET /api/products/barcodes failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        if (branchId === "all") {
            return NextResponse.json(
                { error: "Select a branch to generate barcodes." },
                { status: 400 },
            );
        }

        const body = await req.json();
        const {
            productName,
            labelDescription,
            imageSrc,
            sku,
            quantity,
        } = body;

        if (!productName?.trim() || !labelDescription?.trim() || !imageSrc?.trim()) {
            return NextResponse.json(
                { error: "Product name, description, and photo are required." },
                { status: 400 },
            );
        }

        const label = await createBarcodeLabel({
            businessId: payload.bid,
            branchId: branchId || null,
            productName,
            labelDescription,
            imageSrc,
            sku,
            quantity: Number(quantity) || 1,
        });

        return NextResponse.json(label, { status: 201 });
    } catch (error) {
        console.error("POST /api/products/barcodes failed:", error);
        const message = error instanceof Error ? error.message : "Failed to save barcode";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
