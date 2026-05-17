import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import {
    createStockTakeSession,
    listRecentStockTakeSessions,
} from "@/server/stock-take/stock-take-service";
import { z } from "zod";

const createSchema = z.object({
    note: z.string().optional().nullable(),
});

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const branchId = await getActiveBranchIdFromContext();
        if (!branchId) {
            return NextResponse.json({ error: "Select a branch for stock take" }, { status: 400 });
        }
        const { searchParams } = new URL(req.url);
        const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20));
        const rows = await listRecentStockTakeSessions(payload.bid, branchId, limit);
        return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error("GET /api/stock-take/sessions", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const branchId = await getActiveBranchIdFromContext();
        if (!branchId) {
            return NextResponse.json({ error: "Select a branch for stock take" }, { status: 400 });
        }
        const json = await req.json().catch(() => ({}));
        const parsed = createSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
        const row = await createStockTakeSession({
            businessId: payload.bid,
            branchId,
            userId: typeof payload.sub === "string" ? payload.sub : null,
            note: parsed.data.note ?? null,
        });
        if (!row) return NextResponse.json({ error: "Failed" }, { status: 500 });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        console.error("POST /api/stock-take/sessions", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
