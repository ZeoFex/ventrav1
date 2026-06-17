/**
 * Product Service — high speed CRUD with Redis caching.
 * Targets "Instant Load" by hitting Redis first for business-scoped product lists.
 */
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { products, productTags, tags, categories, subcategories, productVariations } from "../db/schema/products";
import { redis } from "../lib/redis";
import { sellableUnits } from "../stock/sellable-stock";
import {
    notifyProductAdded,
    notifyProductsBulkAdded,
    resolveBusinessName,
} from "../platform/platform-notification-service";

// Key formats
const CACHE_KEYS = {
    LIST: (bizId: string, brn?: string | null) => `products:biz_${bizId}:brn_${brn || 'all'}:list`,
    SINGLE: (bizId: string, id: string) => `products:biz_${bizId}:prod_${id}`,
};

const CACHE_TTL = 3600; // 1 hour

export function generateSku(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `VTR-${ts}-${rand}`;
}

export function prepareVariations(productId: string, variations: any[]) {
    return variations.map((v: any) => ({
        productId,
        name: v.name,
        type: v.type,
        priceGhs: v.priceGhs?.toString(),
        stock: v.stock || 0,
        sku: v.sku || generateSku(),
        barcode: v.barcode || v.sku || generateSku(),
    }));
}

export interface ProductInput {
    businessId: string;
    branchId?: string | null;
    categoryId?: string | null;
    subcategoryId?: string | null;
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
    /** Unit of measure (e.g. "piece", "kg", "g", "lb", "ml"). */
    unit?: string;
    status?: "active" | "archived" | "out_of_stock";
    tagIds?: string[];
    variations?: ProductVariationInput[];
}

export interface ProductVariationInput {
    id?: string;
    name: string;
    type: string;
    priceGhs?: string | null;
    stock: number;
    sku?: string | null;
    barcode?: string | null;
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
            stockReserved: products.stockReserved,
            unit: products.unit,
            status: products.status,
            description: products.description,
            imageSrc: products.imageSrc,
            categoryName: categories.name,
            categoryId: products.categoryId,
            subcategoryName: subcategories.name,
            subcategoryId: products.subcategoryId,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
        .where(
            and(
                eq(products.businessId, businessId),
                branchId ? eq(products.branchId, branchId) : undefined
            )
        );

    // Fetch variations for these products
    const productIds = rows.map(r => r.id);
    const variations = productIds.length > 0 
        ? await db.select().from(productVariations).where(sql`${productVariations.productId} IN ${productIds}`)
        : [];

    // Fill missing variation SKU/barcode in the API response only — never write on read.
    // (Persisting here caused SKUs to change the next time someone opened the product list.)
    const finalVariations = variations.map((v) => {
        if (!v.sku || !v.barcode) {
            const sku = v.sku || generateSku();
            const barcode = v.barcode || sku;
            return { ...v, sku, barcode };
        }
        return v;
    });

    const rowsWithVariations = rows.map((row) => ({
        ...row,
        stockAvailable: sellableUnits(Number(row.stock), Number(row.stockReserved ?? 0)),
        variations: finalVariations
            .filter((v) => v.productId === row.id)
            .map((v) => ({
                id: v.id,
                productId: v.productId,
                name: v.name,
                type: v.type,
                priceGhs: v.priceGhs,
                stock: v.stock,
                stockReserved: v.stockReserved,
                stockAvailable: sellableUnits(
                    Number(v.stock),
                    Number(v.stockReserved ?? 0),
                ),
                sku: v.sku,
                barcode: v.barcode,
            })),
    }));

    await redis.setex(key, CACHE_TTL, JSON.stringify(rowsWithVariations));

    return rowsWithVariations;
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
                subcategoryId: input.subcategoryId || null,
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
                unit: input.unit || "piece",
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

        // 3. Insert variations
        if (input.variations && input.variations.length > 0) {
            await tx.insert(productVariations).values(prepareVariations(inserted.id, input.variations));
        }

        return inserted;
    });

    // 3. Invalidate cache (Write-through pattern)
    await Promise.all([
        redis.del(CACHE_KEYS.LIST(input.businessId, input.branchId)),
        redis.del(CACHE_KEYS.LIST(input.businessId, "all"))
    ]);
    console.log(`[Cache] Invalidated list for business ${input.businessId}`);

    void resolveBusinessName(input.businessId).then((shopName) => {
        notifyProductAdded(input.businessId, result.id, input.name, shopName);
    });

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
        .returning({
            id: products.id,
            branchId: products.branchId,
            stock: products.stock,
            reorderAt: products.reorderAt,
        });

    if (!updated) {
        return undefined;
    }

    // Background check: if stock is low, we would queue an alert job here (BullMQ)
    if (updated.stock !== null && updated.reorderAt !== null && updated.stock <= updated.reorderAt) {
        // trigger low stock job...
    }

    // Invalidate branch-scoped list + aggregate (POS stock must not show stale quantities)
    await Promise.all([
        redis.del(CACHE_KEYS.LIST(businessId, updated.branchId ?? null)),
        redis.del(CACHE_KEYS.LIST(businessId, "all")),
    ]);

    return updated;
}

/**
 * Bulk save products for high throughput.
 * This skips relation handling (tags/variations) for maximum speed.
 */
export async function saveProductsBulk(businessId: string, branchId: string, items: any[]) {
    const result = await db.insert(products).values(
        items.map(item => ({
            ...item,
            businessId,
            branchId: branchId === "all" ? null : branchId,
            status: item.status || "active",
        }))
    ).returning({ id: products.id });

    // Invalidate cache once
    await Promise.all([
        redis.del(CACHE_KEYS.LIST(businessId, branchId)),
        redis.del(CACHE_KEYS.LIST(businessId, "all"))
    ]);

    if (result.length > 0) {
        void resolveBusinessName(businessId).then((shopName) => {
            notifyProductsBulkAdded(businessId, result.length, shopName);
        });
    }

    return result;
}
