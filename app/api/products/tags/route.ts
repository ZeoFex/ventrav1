import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { db } from "@/server/db";
import { tags } from "@/server/db/schema/products";
import { eq } from "drizzle-orm";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        let query = db.select().from(tags).where(eq(tags.businessId, payload.bid));
        if (branchId && branchId !== "all") {
            const { and } = await import("drizzle-orm");
            query = db.select().from(tags).where(and(
                eq(tags.businessId, payload.bid),
                eq(tags.branchId, branchId)
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
            return NextResponse.json({ error: "Cannot create tag in Global View. Select a branch first." }, { status: 400 });
        }

        const { name, color } = await req.json();

        const [inserted] = await db
            .insert(tags)
            .values({
                businessId: payload.bid,
                branchId: branchId || null,
                name,
                color,
            })
            .returning();

        return NextResponse.json(inserted, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const { id, name, color } = await req.json();

        if (!id) return NextResponse.json({ error: "Missing tag ID" }, { status: 400 });

        const [updated] = await db
            .update(tags)
            .set({
                name,
                color,
            })
            .where(eq(tags.id, id))
            .returning();

        if (!updated) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update tag" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Missing tag ID" }, { status: 400 });

        const [deleted] = await db
            .delete(tags)
            .where(eq(tags.id, id))
            .returning();

        if (!deleted) return NextResponse.json({ error: "Tag not found" }, { status: 404 });

        return NextResponse.json({ message: "Tag deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
    }
}
