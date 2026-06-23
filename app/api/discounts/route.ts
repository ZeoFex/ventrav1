import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { discounts } from "@/server/db/schema/discounts";
import { eq, and, or, isNull } from "drizzle-orm";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        let query;
        if (branchId && branchId !== "all") {
            // Include branch-specific OR global discounts
            query = db.select().from(discounts).where(
                and(
                    eq(discounts.businessId, payload.bid),
                    or(
                        eq(discounts.branchId, branchId),
                        isNull(discounts.branchId)
                    )
                )
            );
        } else {
            query = db.select().from(discounts).where(eq(discounts.businessId, payload.bid));
        }

        const data = await query;
        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/discounts Error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        // If created in global view, branchId is null (applies to all branches)
        const finalBranchId = branchId === "all" ? null : branchId;

        const {
            name,
            type,
            value,
            isActive = true,
            autoApply = false,
            minOrderValueGhs,
            productIds,
            startDate,
            endDate,
        } = await req.json();

        if (!name || !type || value === undefined) {
             return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const [inserted] = await db
            .insert(discounts)
            .values({
                businessId: payload.bid,
                branchId: finalBranchId,
                name,
                type,
                value,
                isActive,
                autoApply,
                minOrderValueGhs: minOrderValueGhs ? minOrderValueGhs.toString() : null,
                productIds: Array.isArray(productIds) && productIds.length > 0 ? productIds : null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
            })
            .returning();

        return NextResponse.json(inserted, { status: 201 });
    } catch (error) {
        console.error("POST /api/discounts Error", error);
        return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
    }
}
