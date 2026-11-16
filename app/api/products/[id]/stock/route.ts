import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { updateStock } from "@/server/products/product-service";
import { logShopActivity } from "@/server/platform/shop-activity-log";
import { db } from "@/server/db";
import { products } from "@/server/db/schema/products";
import { and, eq } from "drizzle-orm";

/**
 * PATCH /api/products/[id]/stock
 * Body: { delta: number } — positive adds stock, negative removes.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const branchId = await getActiveBranchIdFromContext();
        if (branchId === "all") {
            return NextResponse.json(
                { error: "Select a branch to adjust stock" },
                { status: 400 },
            );
        }

        let body: { delta?: number };
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const delta = typeof body.delta === "number" ? body.delta : Number(body.delta);
        if (!Number.isFinite(delta) || delta === 0) {
            return NextResponse.json({ error: "delta must be a non-zero number" }, { status: 400 });
        }

        const [existing] = await db
            .select({ branchId: products.branchId })
            .from(products)
            .where(and(eq(products.id, id), eq(products.businessId, payload.bid)))
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (branchId && existing.branchId !== branchId) {
            return NextResponse.json(
                { error: "Product belongs to a different branch" },
                { status: 403 },
            );
        }

        const updated = await updateStock(payload.bid, id, delta);
        if (!updated) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        void logShopActivity({
            req,
            userId: payload.sub,
            businessId: payload.bid,
            action: "shop.stock.adjusted",
            resource: "stock",
            resourceId: id,
            detail: `${delta > 0 ? "+" : ""}${delta} units · now ${updated.stock}`,
            metadata: { delta, stock: updated.stock },
        });

        return NextResponse.json({
            id: updated.id,
            stock: updated.stock,
            delta,
        });
    } catch (error) {
        console.error("PATCH /api/products/[id]/stock failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
