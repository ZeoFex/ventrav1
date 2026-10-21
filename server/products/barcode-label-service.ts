import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { productBarcodeLabels, products } from "@/server/db/schema/products";
import { generateSku } from "./product-service";

export type BarcodeLabelInput = {
    businessId: string;
    branchId: string | null;
    productName: string;
    labelDescription: string;
    imageSrc: string;
    sku?: string;
    quantity: number;
};

export async function listBarcodeLabels(
    businessId: string,
    branchId: string | null | "all",
) {
    const conditions = [eq(productBarcodeLabels.businessId, businessId)];
    if (branchId && branchId !== "all") {
        conditions.push(eq(productBarcodeLabels.branchId, branchId));
    }

    const rows = await db
        .select({
            id: productBarcodeLabels.id,
            productId: productBarcodeLabels.productId,
            labelName: productBarcodeLabels.labelName,
            labelDescription: productBarcodeLabels.labelDescription,
            imageSrc: productBarcodeLabels.imageSrc,
            sku: productBarcodeLabels.sku,
            priceGhs: productBarcodeLabels.priceGhs,
            unit: productBarcodeLabels.unit,
            quantity: productBarcodeLabels.quantity,
            createdAt: productBarcodeLabels.createdAt,
            updatedAt: productBarcodeLabels.updatedAt,
            productName: products.name,
        })
        .from(productBarcodeLabels)
        .leftJoin(products, eq(productBarcodeLabels.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(productBarcodeLabels.createdAt));

    return rows.map((row) => ({
        ...row,
        productName: row.productName ?? row.labelName,
        priceGhs: row.priceGhs != null ? Number(row.priceGhs) : null,
    }));
}

export async function lookupBarcodeLabel(
    businessId: string,
    sku: string,
    branchId?: string | null,
) {
    const code = sku.trim().toUpperCase();
    if (!code) return null;

    const conditions = [
        eq(productBarcodeLabels.businessId, businessId),
        eq(productBarcodeLabels.sku, code),
    ];
    if (branchId && branchId !== "all") {
        conditions.push(eq(productBarcodeLabels.branchId, branchId));
    }

    const [row] = await db
        .select({
            id: productBarcodeLabels.id,
            productId: productBarcodeLabels.productId,
            labelName: productBarcodeLabels.labelName,
            labelDescription: productBarcodeLabels.labelDescription,
            imageSrc: productBarcodeLabels.imageSrc,
            sku: productBarcodeLabels.sku,
        })
        .from(productBarcodeLabels)
        .where(and(...conditions))
        .orderBy(desc(productBarcodeLabels.createdAt))
        .limit(1);

    return row ?? null;
}

export async function linkBarcodeLabelToProduct(
    businessId: string,
    sku: string,
    productId: string,
) {
    const code = sku.trim().toUpperCase();
    if (!code) return;

    await db
        .update(productBarcodeLabels)
        .set({ productId, updatedAt: new Date() })
        .where(
            and(
                eq(productBarcodeLabels.businessId, businessId),
                eq(productBarcodeLabels.sku, code),
                isNull(productBarcodeLabels.productId),
            ),
        );
}

export async function createBarcodeLabel(input: BarcodeLabelInput) {
    const productName = input.productName.trim();
    const labelDescription = input.labelDescription.trim();
    const imageSrc = input.imageSrc.trim();
    const sku = (input.sku?.trim() || generateSku()).toUpperCase();

    const [inserted] = await db
        .insert(productBarcodeLabels)
        .values({
            businessId: input.businessId,
            branchId: input.branchId,
            productId: null,
            labelName: productName,
            labelDescription,
            imageSrc,
            sku,
            quantity: Math.max(1, input.quantity),
        })
        .returning();

    return {
        ...inserted,
        productName,
        priceGhs: null,
    };
}

export async function deleteBarcodeLabel(
    id: string,
    businessId: string,
) {
    const [deleted] = await db
        .delete(productBarcodeLabels)
        .where(
            and(
                eq(productBarcodeLabels.id, id),
                eq(productBarcodeLabels.businessId, businessId),
            ),
        )
        .returning();

    return deleted ?? null;
}

/** Platform-wide barcode label search — lets shops find labels created by others. */
export async function searchGlobalBarcodeLabels(
    query: string,
    options?: { limit?: number; viewerBusinessId?: string },
) {
    const q = query.trim();
    const limit = Math.min(Math.max(options?.limit ?? 40, 1), 100);

    const pattern = q.length >= 1 ? `%${q}%` : null;

    const conditions = pattern
        ? or(
              ilike(productBarcodeLabels.labelName, pattern),
              ilike(productBarcodeLabels.labelDescription, pattern),
              ilike(productBarcodeLabels.sku, `%${q.toUpperCase()}%`),
              ilike(products.name, pattern),
              ilike(products.description, pattern),
              ilike(products.sku, pattern),
              ilike(products.barcode, pattern),
          )
        : undefined;

    const rows = await db
        .select({
            id: productBarcodeLabels.id,
            businessId: productBarcodeLabels.businessId,
            branchId: productBarcodeLabels.branchId,
            productId: productBarcodeLabels.productId,
            labelName: productBarcodeLabels.labelName,
            labelDescription: productBarcodeLabels.labelDescription,
            imageSrc: productBarcodeLabels.imageSrc,
            sku: productBarcodeLabels.sku,
            quantity: productBarcodeLabels.quantity,
            createdAt: productBarcodeLabels.createdAt,
            businessName: businesses.name,
            linkedProductName: products.name,
        })
        .from(productBarcodeLabels)
        .innerJoin(businesses, eq(productBarcodeLabels.businessId, businesses.id))
        .leftJoin(products, eq(productBarcodeLabels.productId, products.id))
        .where(conditions)
        .orderBy(desc(productBarcodeLabels.createdAt))
        .limit(limit);

    return rows.map((row) => ({
        id: row.id,
        businessId: row.businessId,
        branchId: row.branchId,
        productId: row.productId,
        labelName: row.labelName,
        labelDescription: row.labelDescription,
        imageSrc: row.imageSrc,
        sku: row.sku,
        quantity: row.quantity,
        createdAt: row.createdAt,
        businessName: row.businessName,
        productName: row.linkedProductName ?? row.labelName,
        isOwnShop: options?.viewerBusinessId
            ? row.businessId === options.viewerBusinessId
            : false,
    }));
}

/** Recent labels platform-wide — for catalog preview slider. */
export async function listRecentGlobalBarcodeLabels(
    options?: { limit?: number; viewerBusinessId?: string },
) {
    return searchGlobalBarcodeLabels("", options);
}
