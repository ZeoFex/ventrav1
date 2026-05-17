import { NextResponse } from "next/server";
import { hasMinRole, requireOwner, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getBranches, saveBranch, BranchLimitExceededError } from "@/server/branches/branch-service";

/**
 * GET /api/branches
 * Returns all branches for the authenticated business.
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
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
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const denied = requireOwner(payload);
        if (denied !== true) {
            return denied;
        }
        const body = await req.json();

        const result = await saveBranch({
            ...body,
            businessId: payload.bid,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        if (error instanceof BranchLimitExceededError) {
            return NextResponse.json({ error: error.message, code: error.code }, { status: 409 });
        }
        console.error("POST /api/branches failed:", error);
        return NextResponse.json({ error: "Failed to save branch" }, { status: 500 });
    }
}
