import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { getProducts, saveProduct } from "@/server/products/product-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

/**
 * GET /api/products
 * Returns a list of products for the authenticated business.
 * Leverages Redis caching for "Instant Load" performance.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const products = await getProducts(payload.bid, branchId);

        // No browser caching — Redis handles server-side speed.
        // This prevents stale stock data from overwriting optimistic updates.
        return NextResponse.json(products, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("GET /api/products failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/products
 * Creates a new product and invalidates the cache.
 */
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        if (branchId === "all") {
            return NextResponse.json({ error: "Cannot create product in Global View." }, { status: 400 });
        }

        const body = await req.json();

        const result = await saveProduct({
            ...body,
            businessId: payload.bid,
            branchId: branchId,
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("POST /api/products failed:", error);
        return NextResponse.json({ error: "Failed to save product" }, { status: 500 });
    }
}

/**
 * DELETE /api/products?id=...
 */
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        // Delete from DB and Invalidate cache
        const { redis } = await import("@/server/lib/redis");
        const { db } = await import("@/server/db");
        const { products } = await import("@/server/db/schema/products");
        const { eq, and } = await import("drizzle-orm");

        await db.delete(products).where(and(
            eq(products.id, id),
            eq(products.businessId, payload.bid),
            branchId && branchId !== "all" ? eq(products.branchId, branchId) : undefined
        ));

        await Promise.all([
            redis.del(`products:biz_${payload.bid}:brn_${branchId || 'all'}:list`),
            redis.del(`products:biz_${payload.bid}:brn_all:list`)
        ]);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

/**
 * PUT /api/products
 * Updates an existing product.
 */
export async function PUT(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const { id, ...data } = await req.json();

        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        const { redis } = await import("@/server/lib/redis");
        const { db } = await import("@/server/db");
        const { products, productTags } = await import("@/server/db/schema/products");
        const { eq, and } = await import("drizzle-orm");

        await db.transaction(async (tx) => {
            // Update product
            await tx
                .update(products)
                .set({
                    categoryId: data.categoryId || null,
                    name: data.name,
                    slug: data.slug,
                    sku: data.sku,
                    barcode: data.barcode,
                    description: data.description,
                    imageSrc: data.imageSrc,
                    priceGhs: data.priceGhs,
                    costPriceGhs: data.costPriceGhs,
                    stock: data.stock,
                    reorderAt: data.reorderAt,
                    status: data.status,
                    updatedAt: new Date(),
                })
                .where(and(
                    eq(products.id, id),
                    eq(products.businessId, payload.bid),
                    branchId && branchId !== "all" ? eq(products.branchId, branchId) : undefined
                ));

            // Update tags if provided
            if (data.tagIds) {
                await tx.delete(productTags).where(eq(productTags.productId, id));
                if (data.tagIds.length > 0) {
                    await tx.insert(productTags).values(
                        data.tagIds.map((tid: string) => ({
                            productId: id,
                            tagId: tid,
                        }))
                    );
                }
            }

            // Sync variations if provided
            if (data.variations) {
                const { productVariations } = await import("@/server/db/schema/products");
                const { prepareVariations } = await import("@/server/products/product-service");
                
                await tx.delete(productVariations).where(eq(productVariations.productId, id));
                if (data.variations.length > 0) {
                    await tx.insert(productVariations).values(prepareVariations(id, data.variations));
                }
            }
        });

        // Invalidate cache
        await Promise.all([
            redis.del(`products:biz_${payload.bid}:brn_${branchId || 'all'}:list`),
            redis.del(`products:biz_${payload.bid}:brn_all:list`)
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PUT /api/products failed:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
