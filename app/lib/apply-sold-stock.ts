import type { ProductRow } from "@/app/components/dashboard/products/types";
import {
    inventoryLivesOnParent,
    onHandUnits,
    sellableUnits,
    toStockQty,
} from "@/server/stock/sellable-stock";

export type SoldLine = {
    productId: string;
    variationId?: string | null;
    qty: number;
};

/**
 * Bulk import often stores qty on the parent product and creates variations
 * with 0 stock. POS must use the parent count in that case — otherwise the
 * register shows 0 while the product page still shows 30, and sales never
 * decrement the real inventory.
 */
export function catalogStockIsOnParent(p: Pick<ProductRow, "stock" | "variations">): boolean {
    return inventoryLivesOnParent((p.variations ?? []).map((v) => v.stock));
}

/** Physical stock for a product or variation. Negative means oversold. */
export function onHandForLine(p: ProductRow, variationId?: string): number {
    const parentOnHand = onHandUnits(p.stock, p.stockReserved);
    if (catalogStockIsOnParent(p)) return parentOnHand;

    if (variationId && p.variations?.length) {
        const v = p.variations.find((x) => x.id === variationId);
        if (v) return onHandUnits(v.stock, v.stockReserved);
    }
    if (p.variations && p.variations.length > 0) {
        return p.variations.reduce((sum, v) => sum + onHandUnits(v.stock, v.stockReserved), 0);
    }
    return parentOnHand;
}

/** Apply sold quantities to a product list so POS stock updates immediately. */
export function applySoldToCatalog(products: ProductRow[], sold: SoldLine[]): ProductRow[] {
    return products.map((p) => {
        const lines = sold.filter((l) => l.productId === p.id);
        if (lines.length === 0) return p;

        let stock = toStockQty(p.stock);
        const reserved = toStockQty(p.stockReserved);
        const stockOnParent = catalogStockIsOnParent(p);
        let variations = p.variations?.map((v) => ({ ...v }));

        for (const line of lines) {
            const qty = toStockQty(line.qty);
            if (qty <= 0) continue;
            if (line.variationId && variations?.length && !stockOnParent) {
                variations = variations.map((v) => {
                    if (v.id !== line.variationId) return v;
                    const next = toStockQty(v.stock) - qty;
                    return {
                        ...v,
                        stock: next,
                        stockAvailable: sellableUnits(next, v.stockReserved),
                    };
                });
            } else {
                stock -= qty;
            }
        }

        return {
            ...p,
            stock,
            stockAvailable: sellableUnits(stock, reserved),
            variations,
        };
    });
}
