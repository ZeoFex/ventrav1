import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import { categories, products } from "../db/schema/products";
import {
    resolveShopType,
    shopTypeLabel,
    UNCATEGORIZED_LABEL,
} from "../catalog/constants";

export type StorefrontProduct = {
    id: string;
    name: string;
    description: string | null;
    imageSrc: string | null;
    sku: string | null;
    barcode: string | null;
    unit: string | null;
    priceGhs: string;
    stock: number;
    status: string;
    categoryName: string;
    shopId: string;
    shopName: string;
    shopType: string;
    shopTypeLabel: string;
    city: string | null;
};

export async function listStorefrontProducts(opts: {
    limit: number;
    offset: number;
    q?: string;
    shopId?: string;
    shopType?: string;
    category?: string;
}): Promise<{ total: number; items: StorefrontProduct[] }> {
    const conditions = [eq(products.status, "active")];
    if (opts.shopId) conditions.push(eq(products.businessId, opts.shopId));
    if (opts.shopType) {
        const label = shopTypeLabel(opts.shopType);
        conditions.push(
            or(
                eq(businesses.businessType, opts.shopType),
                ilike(businesses.businessType, label),
            )!,
        );
    }
    if (opts.category?.trim()) {
        const cat = opts.category.trim();
        if (cat.toLowerCase() === UNCATEGORIZED_LABEL.toLowerCase()) {
            conditions.push(sql`${categories.name} is null`);
        } else {
            conditions.push(ilike(categories.name, cat));
        }
    }
    if (opts.q?.trim()) {
        const term = `%${opts.q.trim().replace(/[%_]/g, "")}%`;
        conditions.push(
            or(
                ilike(products.name, term),
                ilike(products.sku, term),
                ilike(products.barcode, term),
                ilike(businesses.name, term),
                ilike(categories.name, term),
            )!,
        );
    }

    const where = and(...conditions);

    const [totalRow] = await db
        .select({ n: count() })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where);

    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            description: products.description,
            imageSrc: products.imageSrc,
            sku: products.sku,
            barcode: products.barcode,
            unit: products.unit,
            priceGhs: products.priceGhs,
            stock: products.stock,
            status: products.status,
            categoryName: categories.name,
            shopId: businesses.id,
            shopName: businesses.name,
            shopType: businesses.businessType,
            city: businesses.city,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(products.updatedAt), asc(products.name))
        .limit(opts.limit)
        .offset(opts.offset);

    return {
        total: Number(totalRow?.n ?? 0),
        items: rows.map((row) => {
            const shopType = resolveShopType(row.shopType);
            return {
                id: row.id,
                name: row.name,
                description: row.description,
                imageSrc: row.imageSrc,
                sku: row.sku,
                barcode: row.barcode,
                unit: row.unit,
                priceGhs: String(row.priceGhs ?? "0"),
                stock: Number(row.stock ?? 0),
                status: row.status,
                categoryName: (row.categoryName ?? "").trim() || UNCATEGORIZED_LABEL,
                shopId: row.shopId,
                shopName: row.shopName,
                shopType,
                shopTypeLabel: shopTypeLabel(shopType),
                city: row.city,
            };
        }),
    };
}

export async function getStorefrontMeta() {
    const [shopRows, categoryRows] = await Promise.all([
        db
            .select({
                id: businesses.id,
                name: businesses.name,
                shopType: businesses.businessType,
                city: businesses.city,
                productCount: sql<number>`count(${products.id})::int`,
            })
            .from(businesses)
            .innerJoin(products, and(eq(products.businessId, businesses.id), eq(products.status, "active")))
            .groupBy(businesses.id, businesses.name, businesses.businessType, businesses.city)
            .orderBy(asc(businesses.name)),
        db
            .select({
                name: categories.name,
                count: sql<number>`count(${products.id})::int`,
            })
            .from(products)
            .innerJoin(businesses, eq(products.businessId, businesses.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(eq(products.status, "active"))
            .groupBy(categories.name)
            .orderBy(desc(sql`count(${products.id})`)),
    ]);

    const typeMap = new Map<string, { id: string; label: string; productCount: number }>();
    for (const shop of shopRows) {
        const id = resolveShopType(shop.shopType);
        const prev = typeMap.get(id);
        typeMap.set(id, {
            id,
            label: shopTypeLabel(id),
            productCount: (prev?.productCount ?? 0) + Number(shop.productCount ?? 0),
        });
    }

    return {
        shops: shopRows.map((s) => ({
            id: s.id,
            name: s.name,
            city: s.city,
            shopType: resolveShopType(s.shopType),
            shopTypeLabel: shopTypeLabel(resolveShopType(s.shopType)),
            productCount: Number(s.productCount ?? 0),
        })),
        shopTypes: [...typeMap.values()].sort((a, b) => b.productCount - a.productCount),
        categories: categoryRows.map((c) => ({
            name: (c.name ?? "").trim() || UNCATEGORIZED_LABEL,
            count: Number(c.count ?? 0),
        })),
    };
}
