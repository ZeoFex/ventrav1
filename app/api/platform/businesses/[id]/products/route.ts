import { and, count, eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { products } from "@/server/db/schema/products";
import { invalidatePosBusinessCaches } from "@/server/pos/pos-service";
import { invalidateBusinessConfig } from "@/server/businesses/business-service";

export const dynamic = "force-dynamic";

const uuidParam = z.string().uuid();
const wipeBody = z.object({
    confirmSlug: z.string().min(1),
    confirmPhrase: z.literal("DELETE PRODUCTS"),
});
const selectiveBody = z.object({
    ids: z.array(z.string().uuid()).min(1).max(200),
});

/**
 * DELETE /api/platform/businesses/[id]/products
 * - Wipe all: { confirmSlug, confirmPhrase: "DELETE PRODUCTS" }
 * - Selective: { ids: uuid[] } (scoped to this business)
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const [row] = await db
        .select({ id: businesses.id, slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const selective = selectiveBody.safeParse(body);
    if (selective.success) {
        const ids = Array.from(new Set(selective.data.ids));
        const deleted = await db
            .delete(products)
            .where(and(eq(products.businessId, id), inArray(products.id, ids)))
            .returning({ id: products.id });
        await invalidatePosBusinessCaches(id);
        await invalidateBusinessConfig(id);
        return NextResponse.json({
            success: true,
            deletedProducts: deleted.length,
            deletedIds: deleted.map((d) => d.id),
        });
    }

    const wipe = wipeBody.safeParse(body);
    if (!wipe.success) {
        return NextResponse.json(
            {
                error:
                    'Provide either { ids: uuid[] } or { confirmSlug, confirmPhrase: "DELETE PRODUCTS" }',
                details: wipe.error.flatten(),
            },
            { status: 400 },
        );
    }

    if (row.slug.trim() !== wipe.data.confirmSlug.trim()) {
        return NextResponse.json(
            { error: "confirmSlug does not match this business" },
            { status: 400 },
        );
    }

    const [before] = await db
        .select({ total: count() })
        .from(products)
        .where(eq(products.businessId, id));

    await db.delete(products).where(eq(products.businessId, id));
    await invalidatePosBusinessCaches(id);
    await invalidateBusinessConfig(id);

    return NextResponse.json({
        success: true,
        deletedProducts: Number(before?.total ?? 0),
    });
}

/**
 * GET /api/platform/businesses/[id]/products
 * Count products for confirmation UI.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    const [row] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [stats] = await db
        .select({ total: count() })
        .from(products)
        .where(and(eq(products.businessId, id)));

    return NextResponse.json({ productsCount: Number(stats?.total ?? 0) });
}
