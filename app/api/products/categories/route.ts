import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema/products";
import { eq } from "drizzle-orm";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { redis } from "@/server/lib/redis";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

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
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
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
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
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
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
