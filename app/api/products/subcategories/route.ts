import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { subcategories } from "@/server/db/schema/products";
import { eq, and, ilike } from "drizzle-orm";
import { z } from "zod";
import { slugifyCategoryName } from "@/server/catalog/shop-type-defaults";

const createSchema = z.object({
    name: z.string().min(1).max(255),
    categoryId: z.string().uuid(),
});

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get("categoryId");
        const q = searchParams.get("q")?.trim();

        const conditions = [eq(subcategories.businessId, payload.bid)];

        if (categoryId) {
            conditions.push(eq(subcategories.categoryId, categoryId));
        }
        if (branchId && branchId !== "all") {
            conditions.push(eq(subcategories.branchId, branchId));
        }
        if (q) {
            conditions.push(ilike(subcategories.name, `%${q}%`));
        }

        const data = await db
            .select()
            .from(subcategories)
            .where(and(...conditions))
            .limit(q ? 50 : 500);

        return NextResponse.json(data);
    } catch (error) {
        console.error("GET /api/products/subcategories failed:", error);
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
            return NextResponse.json(
                { error: "Cannot create subcategory in Global View. Select a branch first." },
                { status: 400 },
            );
        }

        const parsed = createSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const { name, categoryId } = parsed.data;

        const [inserted] = await db
            .insert(subcategories)
            .values({
                businessId: payload.bid,
                branchId: branchId || null,
                categoryId,
                name: name.trim(),
                slug: slugifyCategoryName(name),
            })
            .returning();

        return NextResponse.json(inserted, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const body = await req.json();
        const id = body.id as string | undefined;
        const name = body.name as string | undefined;

        if (!id || !name?.trim()) {
            return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
        }

        const [updated] = await db
            .update(subcategories)
            .set({
                name: name.trim(),
                slug: slugifyCategoryName(name),
                updatedAt: new Date(),
            })
            .where(
                and(eq(subcategories.id, id), eq(subcategories.businessId, payload.bid)),
            )
            .returning();

        if (!updated) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "Failed to update subcategory" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const authRes = await requireUserAuth(req);
        if (authRes instanceof NextResponse) return authRes;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing subcategory ID" }, { status: 400 });
        }

        const [deleted] = await db
            .delete(subcategories)
            .where(eq(subcategories.id, id))
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: "Subcategory not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Subcategory deleted" });
    } catch {
        return NextResponse.json({ error: "Failed to delete subcategory" }, { status: 500 });
    }
}
