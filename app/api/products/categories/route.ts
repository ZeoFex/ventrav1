import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema/products";
import { businesses } from "@/server/db/schema/businesses";
import { eq, and, ilike } from "drizzle-orm";
import { z } from "zod";
import { slugifyCategoryName } from "@/server/catalog/shop-type-defaults";
import { seedDefaultCategoriesForBusiness } from "@/server/catalog/category-seed-service";

const createSchema = z.object({
    name: z.string().min(1).max(255),
    slug: z.string().max(255).optional(),
    description: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim();

        const conditions = [eq(categories.businessId, payload.bid)];

        if (branchId && branchId !== "all") {
            conditions.push(eq(categories.branchId, branchId));
        }
        if (q) {
            conditions.push(ilike(categories.name, `%${q.replace(/[%_\\]/g, "\\$&")}%`));
        }

        let data = await db
            .select()
            .from(categories)
            .where(and(...conditions))
            .limit(q ? 50 : 500);

        // Auto-seed shop-type defaults for existing accounts with no categories yet
        if (
            data.length === 0 &&
            !q &&
            branchId &&
            branchId !== "all"
        ) {
            const [biz] = await db
                .select({ businessType: businesses.businessType })
                .from(businesses)
                .where(eq(businesses.id, payload.bid))
                .limit(1);

            if (biz?.businessType) {
                await seedDefaultCategoriesForBusiness({
                    businessId: payload.bid,
                    branchId,
                    businessType: biz.businessType,
                    skipIfExists: true,
                });

                data = await db
                    .select()
                    .from(categories)
                    .where(and(...conditions))
                    .limit(500);
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/products/categories failed:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        if (branchId === "all") {
            return NextResponse.json({ error: "Cannot create category in Global View. Select a branch first." }, { status: 400 });
        }

        const { name, slug, description } = createSchema.parse(await req.json());

        const [inserted] = await db
            .insert(categories)
            .values({
                businessId: payload.bid,
                branchId: branchId || null,
                name,
                slug: slug || slugifyCategoryName(name),
                description,
            })
            .returning();

        return NextResponse.json(inserted, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { id, name, slug, description } = await req.json();

        if (!id) return NextResponse.json({ error: "Missing category ID" }, { status: 400 });

        const [updated] = await db
            .update(categories)
            .set({
                name,
                slug: slug || slugifyCategoryName(name),
                description,
                updatedAt: new Date(),
            })
            .where(eq(categories.id, id))
            .returning();

        if (!updated) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const authRes = await requireUserAuth(req);
        if (authRes instanceof NextResponse) return authRes;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing category ID" }, { status: 400 });

        const [deleted] = await db
            .delete(categories)
            .where(eq(categories.id, id))
            .returning();

        if (!deleted) return NextResponse.json({ error: "Category not found" }, { status: 404 });

        return NextResponse.json({ message: "Category deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    }
}
