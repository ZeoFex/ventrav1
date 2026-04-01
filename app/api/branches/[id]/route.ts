import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { getBranch, updateBranch } from "@/server/branches/branch-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";

/**
 * GET /api/branches/[id]
 * Returns a single branch.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
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
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const body = await req.json();

        const result = await updateBranch(payload.bid, id, body);

        return NextResponse.json(result);
    } catch (error) {
        console.error("PUT /api/branches/[id] failed:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
