import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { businessTypeLabel } from "@/config/business-types";
import { db } from "@/server/db";
import { branches } from "@/server/db/schema/branches";
import { businesses } from "@/server/db/schema/businesses";
import { categories, productVariations, products } from "@/server/db/schema/products";

export type ShopVariation = {
    id: string;
    name: string;
    type: string;
    priceGhs: string | null;
    sellable: number;
};

export type ShopListing = {
    id: string;
    name: string;
    priceGhs: string;
    imageSrc: string | null;
    categoryName: string;
    shopId: string;
    shopName: string;
    shopType: string;
    region: string;
    place: string;
    branchId: string | null;
    sellable: number;
    variations: ShopVariation[];
};

export async function listShopCatalog(): Promise<{
    categories: { name: string; count: number }[];
    products: ShopListing[];
}> {
    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            priceGhs: products.priceGhs,
            imageSrc: products.imageSrc,
            stock: products.stock,
            stockReserved: products.stockReserved,
            trackInventory: products.trackInventory,
            categoryName: categories.name,
            shopId: businesses.id,
            shopName: businesses.name,
            businessType: businesses.businessType,
            businessRegion: businesses.region,
            businessCity: businesses.city,
            branchId: products.branchId,
            branchRegion: branches.region,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(branches, eq(products.branchId, branches.id))
        .where(
            and(
                eq(products.status, "active"),
                eq(businesses.status, "active"),
                or(
                    eq(products.trackInventory, false),
                    sql`${products.stock} - ${products.stockReserved} > 0`,
                ),
            ),
        )
        .orderBy(asc(categories.name), asc(products.name))
        .limit(2400);

    const ids = rows.map((row) => row.id);
    const variationRows = ids.length
        ? await db
              .select({
                  id: productVariations.id,
                  productId: productVariations.productId,
                  name: productVariations.name,
                  type: productVariations.type,
                  priceGhs: productVariations.priceGhs,
                  stock: productVariations.stock,
                  stockReserved: productVariations.stockReserved,
              })
              .from(productVariations)
              .where(inArray(productVariations.productId, ids))
        : [];
    const variationsByProduct = new Map<string, ShopVariation[]>();
    for (const variation of variationRows) {
        const sellable = Math.max(
            0,
            Number(variation.stock ?? 0) - Number(variation.stockReserved ?? 0),
        );
        if (sellable <= 0) continue;
        const list = variationsByProduct.get(variation.productId) ?? [];
        list.push({
            id: variation.id,
            name: variation.name.trim(),
            type: variation.type.trim(),
            priceGhs: variation.priceGhs == null ? null : String(variation.priceGhs),
            sellable,
        });
        variationsByProduct.set(variation.productId, list);
    }

    const productsOut: ShopListing[] = rows.map((row) => {
        const sellable = row.trackInventory
            ? Math.max(0, Number(row.stock ?? 0) - Number(row.stockReserved ?? 0))
            : 99;
        const region =
            row.branchRegion?.trim() ||
            row.businessRegion?.trim() ||
            row.businessCity?.trim() ||
            "Ghana";
        const place = row.businessCity?.trim() || region;
        return {
            id: row.id,
            name: row.name,
            priceGhs: String(row.priceGhs ?? "0"),
            imageSrc: row.imageSrc,
            categoryName: row.categoryName?.trim() || "General",
            shopId: row.shopId,
            shopName: row.shopName,
            shopType: row.businessType ? businessTypeLabel(row.businessType) : "Other",
            region,
            place,
            branchId: row.branchId,
            sellable,
            variations: variationsByProduct.get(row.id) ?? [],
        };
    });

    const counts = new Map<string, number>();
    for (const product of productsOut) {
        counts.set(product.categoryName, (counts.get(product.categoryName) ?? 0) + 1);
    }

    return {
        categories: [...counts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
        products: productsOut,
    };
}
