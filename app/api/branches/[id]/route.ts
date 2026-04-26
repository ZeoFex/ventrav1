import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getBranch, updateBranch } from "@/server/branches/branch-service";

/**
 * GET /api/branches/[id]
 * Returns a single branch.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branch = await getBranch(payload.bid, id);

        if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

        return NextResponse.json(branch);
    } catch (error) {
        console.error("GET /api/branches/[id] failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PUT /api/branches/[id]
 * Updates an individual branch.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const body = await req.json();

        const result = await updateBranch(payload.bid, id, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error("PUT /api/branches/[id] failed:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
