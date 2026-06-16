import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { searchProducts } from "@/server/products/product-search-service";
import { z } from "zod";

const querySchema = z.object({
    q: z.string().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const { searchParams } = new URL(req.url);
        const parsed = querySchema.safeParse({
            q: searchParams.get("q") ?? "",
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const results = await searchProducts(
            payload.bid,
            branchId,
            parsed.data.q,
            parsed.data.limit ?? 20,
        );

        return NextResponse.json({ results, query: parsed.data.q });
    } catch (error) {
        console.error("GET /api/products/search failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
