import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { processSaleReturn, SaleReturnError } from "@/server/pos/return-service";

type BodyLine = { saleItemId?: string; quantity?: number };

/**
 * POST /api/sales/returns
 * Body: { saleId, lines: [{ saleItemId, quantity }], reason?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const isOwner = payload.role === "owner";
        const branchId = await getActiveBranchIdFromContext();

        let body: { saleId?: string; lines?: BodyLine[]; reason?: string };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const saleId = typeof body.saleId === "string" ? body.saleId.trim() : "";
        if (!saleId) {
            return NextResponse.json({ error: "saleId is required" }, { status: 400 });
        }

        const rawLines = Array.isArray(body.lines) ? body.lines : [];
        const merged = new Map<string, number>();
        for (const l of rawLines) {
            const id = typeof l.saleItemId === "string" ? l.saleItemId.trim() : "";
            const q = typeof l.quantity === "number" ? l.quantity : Number(l.quantity);
            if (!id || !Number.isFinite(q) || q <= 0) continue;
            merged.set(id, (merged.get(id) ?? 0) + Math.floor(q));
        }

        const lines = [...merged.entries()].map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
        if (lines.length === 0) {
            return NextResponse.json({ error: "At least one valid line with quantity is required" }, { status: 400 });
        }

        const result = await processSaleReturn({
            businessId: payload.bid,
            activeBranchId: branchId,
            saleId,
            userId: payload.sub,
            actorIsOwner: isOwner,
            lines,
            reason: typeof body.reason === "string" ? body.reason : undefined,
        });

        return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        if (error instanceof SaleReturnError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("POST /api/sales/returns failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
