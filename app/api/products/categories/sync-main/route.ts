import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { branches } from "@/server/db/schema/branches";
import { categories } from "@/server/db/schema/products";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const activeBranchId = await getActiveBranchIdFromContext();

        if (!activeBranchId || activeBranchId === "all") {
            return NextResponse.json({ error: "Please select a specific branch to sync into." }, { status: 400 });
        }

        // 1. Find the main branch for this business
        const mainBranches = await db.select().from(branches)
            .where(and(eq(branches.businessId, payload.bid), eq(branches.isMain, true)))
            .limit(1);

        if (!mainBranches.length) {
            return NextResponse.json({ error: "No main branch found for this business." }, { status: 404 });
        }
        const mainBranchId = mainBranches[0].id;

        if (mainBranchId === activeBranchId) {
            return NextResponse.json({ error: "You are already in the main branch." }, { status: 400 });
        }

        // 2. Fetch all categories from the main branch
        const mainCategories = await db.select().from(categories)
            .where(and(eq(categories.businessId, payload.bid), eq(categories.branchId, mainBranchId)));

        if (mainCategories.length === 0) {
            return NextResponse.json({ count: 0, message: "No categories to import from main." });
        }

        // 3. Fetch all categories in the current active branch to prevent duplicates
        const activeCategories = await db.select().from(categories)
            .where(and(eq(categories.businessId, payload.bid), eq(categories.branchId, activeBranchId)));

        const activeCategorySlugs = new Set(activeCategories.map(c => c.slug));

        // 4. Identify missing categories
        const missingCategories = mainCategories.filter(c => !activeCategorySlugs.has(c.slug));

        if (missingCategories.length === 0) {
            return NextResponse.json({ count: 0, message: "Categories already up-to-date." });
        }

        // 5. Insert missing categories
        const toInsert = missingCategories.map(c => ({
            businessId: payload.bid,
            branchId: activeBranchId,
            name: c.name,
            slug: c.slug,
            description: c.description,
        }));

        await db.insert(categories).values(toInsert);

        return NextResponse.json({
            success: true,
            count: missingCategories.length,
            message: `Successfully imported ${missingCategories.length} categories.`
        });
    } catch (err) {
        console.error("Failed to sync categories:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
