import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { products, productVariations } from "../db/schema/products";
import { sales, saleItems } from "../db/schema/sales";
import { invalidatePosBusinessCaches } from "../pos/pos-service";
import { invalidateBusinessConfig } from "../businesses/business-service";

export type PlatformDeleteSalesResult = {
    deletedSales: number;
    deletedIds: string[];
    restockedUnits: number;
    restockedLines: {
        saleId: string;
        productId: string | null;
        productName: string;
        quantityRestored: number;
    }[];
};

/**
 * Hard-delete selected sales for a business.
 * When `restock` is true, restore sellable units (quantity − already returned) to product/variation stock.
 */
export async function platformDeleteBusinessSales(opts: {
    businessId: string;
    saleIds: string[];
    restock: boolean;
}): Promise<PlatformDeleteSalesResult> {
    const ids = Array.from(new Set(opts.saleIds));
    if (ids.length === 0) {
        return { deletedSales: 0, deletedIds: [], restockedUnits: 0, restockedLines: [] };
    }

    const restockedLines: PlatformDeleteSalesResult["restockedLines"] = [];
    let restockedUnits = 0;

    const deletedIds = await db.transaction(async (tx) => {
        const owned = await tx
            .select({ id: sales.id })
            .from(sales)
            .where(and(eq(sales.businessId, opts.businessId), inArray(sales.id, ids)));

        const ownedIds = owned.map((s) => s.id);
        if (ownedIds.length === 0) return [] as string[];

        if (opts.restock) {
            const lines = await tx
                .select({
                    saleId: saleItems.saleId,
                    productId: saleItems.productId,
                    variationId: saleItems.variationId,
                    productName: saleItems.productName,
                    quantity: saleItems.quantity,
                    quantityReturned: saleItems.quantityReturned,
                })
                .from(saleItems)
                .where(inArray(saleItems.saleId, ownedIds));

            for (const line of lines) {
                const restoreQty = Math.max(0, line.quantity - (line.quantityReturned ?? 0));
                if (restoreQty <= 0) continue;

                if (line.variationId) {
                    await tx
                        .update(productVariations)
                        .set({
                            stock: sql`${productVariations.stock} + ${restoreQty}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(productVariations.id, line.variationId));
                } else if (line.productId) {
                    await tx
                        .update(products)
                        .set({
                            stock: sql`${products.stock} + ${restoreQty}`,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(products.id, line.productId),
                                eq(products.businessId, opts.businessId),
                            ),
                        );
                }

                restockedUnits += restoreQty;
                restockedLines.push({
                    saleId: line.saleId,
                    productId: line.productId,
                    productName: line.productName,
                    quantityRestored: restoreQty,
                });
            }
        }

        const deleted = await tx
            .delete(sales)
            .where(and(eq(sales.businessId, opts.businessId), inArray(sales.id, ownedIds)))
            .returning({ id: sales.id });

        return deleted.map((d) => d.id);
    });

    if (opts.restock && deletedIds.length > 0) {
        await invalidatePosBusinessCaches(opts.businessId);
        await invalidateBusinessConfig(opts.businessId);
    }

    return {
        deletedSales: deletedIds.length,
        deletedIds,
        restockedUnits,
        restockedLines,
    };
}

/**
 * Wipe every sale for a business (optional restock of all remaining sellable units).
 */
export async function platformWipeBusinessSales(opts: {
    businessId: string;
    restock: boolean;
}): Promise<PlatformDeleteSalesResult> {
    const all = await db
        .select({ id: sales.id })
        .from(sales)
        .where(eq(sales.businessId, opts.businessId));

    return platformDeleteBusinessSales({
        businessId: opts.businessId,
        saleIds: all.map((s) => s.id),
        restock: opts.restock,
    });
}
