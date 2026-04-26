import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema/products";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        let query = db.select().from(categories).where(eq(categories.businessId, payload.bid));
        if (branchId && branchId !== "all") {
            const { and } = await import("drizzle-orm");
            query = db.select().from(categories).where(and(
                eq(categories.businessId, payload.bid),
                eq(categories.branchId, branchId)
            )) as any;
        }

        const data = await query;
        return NextResponse.json(data);
    } catch (error) {
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

        const { name, slug, description } = await req.json();

        const [inserted] = await db
            .insert(categories)
            .values({
                businessId: payload.bid,
                branchId: branchId || null,
                name,
                slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
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
                slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
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
