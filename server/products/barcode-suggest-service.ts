import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { products } from "@/server/db/schema/products";
import { searchMasterProducts } from "@/server/catalog/master-catalog-service";
import { searchGlobalBarcodeLabels } from "./barcode-label-service";
import { searchGlobalBarcodeCatalogByName } from "./global-barcode-catalog-service";

export type BarcodeProductSuggestion = {
    id: string;
    productName: string;
    description: string | null;
    imageSrc: string | null;
    sku: string | null;
    source:
        | "barcode_label"
        | "global_catalog"
        | "inventory"
        | "master_catalog";
    sourceBusinessName: string | null;
    isOwnShop?: boolean;
};

function nameKey(name: string) {
    return name.trim().toLowerCase();
}

function matchesQuery(
    query: string,
    fields: Array<string | null | undefined>,
): boolean {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return false;
    return fields.some((f) => f?.toLowerCase().includes(q));
}

async function searchPlatformInventoryByName(
    query: string,
    limit: number,
    viewerBusinessId?: string,
) {
    const q = query.trim();
    if (q.length < 2) return [];

    const pattern = `%${q}%`;

    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            description: products.description,
            imageSrc: products.imageSrc,
            sku: products.sku,
            barcode: products.barcode,
            businessId: products.businessId,
            businessName: businesses.name,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .where(
            or(
                ilike(products.name, pattern),
                ilike(products.description, pattern),
                ilike(products.sku, pattern),
                ilike(products.barcode, pattern),
            ),
        )
        .orderBy(desc(products.updatedAt))
        .limit(limit);

    return rows.map((row) => ({
        id: row.id,
        productName: row.name,
        description: row.description,
        imageSrc: row.imageSrc,
        sku: row.barcode || row.sku,
        sourceBusinessName: row.businessName,
        isOwnShop: viewerBusinessId ? row.businessId === viewerBusinessId : false,
    }));
}

/** Merged cross-platform product suggestions for barcode label generation. */
export async function suggestBarcodeProductsByName(
    query: string,
    options?: { limit?: number; viewerBusinessId?: string },
): Promise<BarcodeProductSuggestion[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const limit = Math.min(Math.max(options?.limit ?? 10, 1), 15);

    const [labels, catalog, inventory, master] = await Promise.all([
        searchGlobalBarcodeLabels(q, {
            limit,
            viewerBusinessId: options?.viewerBusinessId,
        }),
        searchGlobalBarcodeCatalogByName(q, limit),
        searchPlatformInventoryByName(q, limit, options?.viewerBusinessId),
        searchMasterProducts(q, limit),
    ]);

    const seen = new Set<string>();
    const results: BarcodeProductSuggestion[] = [];

    const push = (item: BarcodeProductSuggestion) => {
        const key = nameKey(item.productName);
        if (!key || seen.has(key)) return;
        seen.add(key);
        results.push(item);
    };

    for (const label of labels) {
        push({
            id: `label:${label.id}`,
            productName: label.productName ?? label.labelName,
            description: label.labelDescription || null,
            imageSrc: label.imageSrc || null,
            sku: label.sku || null,
            source: "barcode_label",
            sourceBusinessName: label.businessName ?? null,
            isOwnShop: label.isOwnShop,
        });
    }

    for (const entry of catalog) {
        push({
            id: `catalog:${entry.id}`,
            productName: entry.productName,
            description: entry.description,
            imageSrc: entry.imageSrc,
            sku: entry.barcode,
            source: "global_catalog",
            sourceBusinessName: entry.sourceBusinessName,
        });
    }

    for (const row of inventory) {
        push({
            id: `product:${row.id}`,
            productName: row.productName,
            description: row.description,
            imageSrc: row.imageSrc,
            sku: row.sku,
            source: "inventory",
            sourceBusinessName: row.sourceBusinessName,
            isOwnShop: row.isOwnShop,
        });
    }

    for (const item of master) {
        push({
            id: `master:${item.id}`,
            productName: item.name,
            description: item.description,
            imageSrc: item.imageSrc,
            sku: item.barcode || item.sku,
            source: "master_catalog",
            sourceBusinessName: item.sourceBusinessName,
        });
    }

    return results.slice(0, limit);
}

/** Filter local branch history rows on the client or server for extra matches. */
export function filterLocalBarcodeSuggestions(
    query: string,
    rows: Array<{
        id: string;
        productName: string;
        labelDescription: string;
        imageSrc: string;
        sku: string;
    }>,
): BarcodeProductSuggestion[] {
    const q = query.trim();
    if (q.length < 2) return [];

    return rows
        .filter((row) =>
            matchesQuery(q, [row.productName, row.labelDescription, row.sku]),
        )
        .map((row) => ({
            id: `local:${row.id}`,
            productName: row.productName,
            description: row.labelDescription || null,
            imageSrc: row.imageSrc || null,
            sku: row.sku || null,
            source: "barcode_label" as const,
            sourceBusinessName: "Your branch",
            isOwnShop: true,
        }));
}
