/**
 * Product Service — high speed CRUD with Redis caching.
 * Targets "Instant Load" by hitting Redis first for business-scoped product lists.
 */
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { products, productTags, tags, categories } from "../db/schema/products";
import { redis } from "../lib/redis";

// Key formats
const CACHE_KEYS = {
    LIST: (bizId: string, brn?: string | null) => `products:biz_${bizId}:brn_${brn || 'all'}:list`,
    SINGLE: (bizId: string, id: string) => `products:biz_${bizId}:prod_${id}`,
};

const CACHE_TTL = 3600; // 1 hour

export interface ProductInput {
    businessId: string;
    branchId?: string | null;
    categoryId?: string | null;
    name: string;
    slug: string;
    sku: string;
    description?: string | null;
    barcode?: string | null;
    imageSrc?: string | null;
    priceGhs: string;
    costPriceGhs?: string | null;
    stock: number;
    reorderAt: number;
    status?: "active" | "archived" | "out_of_stock";
    tagIds?: string[];
}

/**
 * Fetch products for a business optionally filtered by branch.
 * Attempts to hit Redis cache first for sub-millisecond response.
 */
export async function getProducts(businessId: string, branchId?: string | null) {
    const key = CACHE_KEYS.LIST(businessId, branchId);
    const cached = await redis.get(key);

    if (cached) {
        try {
            console.log(`[Cache] HIT for products of business ${businessId}`);
            return JSON.parse(cached);
        } catch {
            // ignore parse fail, let it fall back
        }
    }

    console.log(`[Cache] MISS for products of business ${businessId}. Fetching from DB...`);

    // High-performance join to include category + tags
    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            priceGhs: products.priceGhs,
            stock: products.stock,
            status: products.status,
            description: products.description,
            imageSrc: products.imageSrc,
            categoryName: categories.name,
            categoryId: products.categoryId,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
            and(
                eq(products.businessId, businessId),
                branchId ? eq(products.branchId, branchId) : undefined
            )
        );

    // Note: For large catalogs, we'd add tags separately or with an aggregate join.
    // For now, simple cache set.
    await redis.setex(key, CACHE_TTL, JSON.stringify(rows));

    return rows;
}

/**
 * Save a new product.
 * Invalidates the business's product list cache immediately.
 */
export async function saveProduct(input: ProductInput) {
    const result = await db.transaction(async (tx) => {
        // 1. Insert product
        const [inserted] = await tx
            .insert(products)
            .values({
                businessId: input.businessId,
                branchId: input.branchId || null,
                categoryId: input.categoryId || null,
                name: input.name,
                slug: input.slug,
                sku: input.sku,
                barcode: input.barcode,
                description: input.description,
                imageSrc: input.imageSrc,
                priceGhs: input.priceGhs,
                costPriceGhs: input.costPriceGhs,
                stock: input.stock,
                reorderAt: input.reorderAt,
                status: input.status || "active",
            })
            .returning({ id: products.id });

        // 2. Insert tags many-to-many
        if (input.tagIds && input.tagIds.length > 0) {
            await tx.insert(productTags).values(
                input.tagIds.map(tid => ({
                    productId: inserted.id,
                    tagId: tid,
                }))
            );
        }

        return inserted;
    });

    // 3. Invalidate cache (Write-through pattern)
    await Promise.all([
        redis.del(CACHE_KEYS.LIST(input.businessId, input.branchId)),
        redis.del(CACHE_KEYS.LIST(input.businessId, "all"))
    ]);
    console.log(`[Cache] Invalidated list for business ${input.businessId}`);

    return result;
}

/**
 * Rapid stock update.
 * Critical for real-time POS operations.
 */
export async function updateStock(businessId: string, productId: string, delta: number) {
    const [updated] = await db
        .update(products)
        .set({
            stock: sql`${products.stock} + ${delta}`,
            updatedAt: new Date(),
        })
        .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
        .returning({ id: products.id, stock: products.stock, reorderAt: products.reorderAt });

    // Background check: if stock is low, we would queue an alert job here (BullMQ)
    if (updated.stock !== null && updated.reorderAt !== null && updated.stock <= updated.reorderAt) {
        // trigger low stock job...
    }

    // Invalidate list cache as stock changed
    await redis.del(CACHE_KEYS.LIST(businessId));

    return updated;
}
