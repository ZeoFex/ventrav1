import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { hasMinRole, requireOwner, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getBusinessConfig, updateBusinessConfig } from "@/server/businesses/business-service";
import { seedDefaultCategoriesForBusiness } from "@/server/catalog/category-seed-service";
import { db } from "@/server/db";
import { branches } from "@/server/db/schema/branches";

/**
 * GET /api/business
 * Retrieves full business profile.
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (!payload.bid) {
            return NextResponse.json({ error: "No business associated" }, { status: 400 });
        }

        const config = await getBusinessConfig(payload.bid);
        return NextResponse.json(config);
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * PATCH /api/business
 * Updates business profile details.
 */
export async function PATCH(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const denied = requireOwner(payload);
        if (denied !== true) {
            return denied;
        }
        if (!payload.bid) {
            return NextResponse.json({ error: "No business associated" }, { status: 400 });
        }

        const body = await req.json();
        const { reseedCategories, ...profile } = body as Record<string, unknown> & {
            reseedCategories?: boolean;
        };

        await updateBusinessConfig(payload.bid, profile);

        if (reseedCategories && typeof profile.businessType === "string" && profile.businessType) {
            const branchRows = await db
                .select({ id: branches.id })
                .from(branches)
                .where(eq(branches.businessId, payload.bid));
            for (const branch of branchRows) {
                await seedDefaultCategoriesForBusiness({
                    businessId: payload.bid,
                    branchId: branch.id,
                    businessType: profile.businessType,
                    skipIfExists: true,
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("API Error [Business PATCH]:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
