import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/server/db";
import { products, productVariations } from "@/server/db/schema/products";
import { barcodeLookupKeys, canonicalBarcodeKey } from "./global-barcode-catalog-service";

/**
 * Returns true if another product in this business already uses this barcode.
 */
export async function findDuplicateBarcodeInBusiness(
    businessId: string,
    barcodeRaw: string,
    excludeProductId?: string,
): Promise<{ productId: string; productName: string } | null> {
    const keys = barcodeLookupKeys(barcodeRaw);
    if (keys.length === 0) return null;

    const productConditions = [
        eq(products.businessId, businessId),
        inArray(products.barcode, keys),
    ];
    if (excludeProductId) {
        productConditions.push(ne(products.id, excludeProductId));
    }

    const [byProduct] = await db
        .select({ productId: products.id, productName: products.name })
        .from(products)
        .where(and(...productConditions))
        .limit(1);

    if (byProduct) return byProduct;

    const variationConditions = [
        eq(products.businessId, businessId),
        inArray(productVariations.barcode, keys),
    ];
    if (excludeProductId) {
        variationConditions.push(ne(products.id, excludeProductId));
    }

    const [byVariation] = await db
        .select({ productId: products.id, productName: products.name })
        .from(productVariations)
        .innerJoin(products, eq(productVariations.productId, products.id))
        .where(and(...variationConditions))
        .limit(1);

    return byVariation ?? null;
}

export function normalizeProductBarcode(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    return canonicalBarcodeKey(raw);
}
