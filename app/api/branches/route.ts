import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { getBranches, saveBranch } from "@/server/branches/branch-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";

/**
 * GET /api/branches
 * Returns all branches for the authenticated business.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branches = await getBranches(payload.bid);

        return NextResponse.json(branches, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/branches failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/branches
 * Creates a new branch.
 */
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const body = await req.json();

        const result = await saveBranch({
            ...body,
            businessId: payload.bid,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("POST /api/branches failed:", error);
        return NextResponse.json({ error: "Failed to save branch" }, { status: 500 });
    }
}
