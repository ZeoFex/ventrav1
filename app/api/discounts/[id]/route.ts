import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { discounts } from "@/server/db/schema/discounts";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;

        const {
            name,
            type,
            value,
            isActive,
            autoApply,
            minOrderValueGhs,
            startDate,
            endDate,
        } = await req.json();

        const id = params.id;
        if (!id) return NextResponse.json({ error: "Missing discount ID" }, { status: 400 });

        const [updated] = await db
            .update(discounts)
            .set({
                name,
                type,
                value,
                isActive,
                autoApply,
                minOrderValueGhs: minOrderValueGhs ? minOrderValueGhs.toString() : null,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                updatedAt: new Date(),
            })
            .where(eq(discounts.id, id))
            .returning();

        if (!updated) return NextResponse.json({ error: "Discount not found" }, { status: 404 });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PUT /api/discounts/[id] Error", error);
        return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;

        const id = params.id;
        if (!id) return NextResponse.json({ error: "Missing discount ID" }, { status: 400 });

        const [deleted] = await db
            .delete(discounts)
            .where(eq(discounts.id, id))
            .returning();

        if (!deleted) return NextResponse.json({ error: "Discount not found" }, { status: 404 });

        return NextResponse.json({ message: "Discount deleted" });
    } catch (error) {
        console.error("DELETE /api/discounts/[id] Error", error);
        return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
    }
}
