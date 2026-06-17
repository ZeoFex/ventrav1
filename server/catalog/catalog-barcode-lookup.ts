import { eq, ilike, or } from "drizzle-orm";
import { db } from "../db";
import { masterProducts } from "../db/schema/master-catalog";
import {
    lookupBarcodeFromWeb,
    type BarcodeWebLookup,
} from "../products/barcode-lookup-service";
import {
    enrichMasterProductRows,
    type MasterProductDto,
} from "./master-catalog-service";

export type CatalogBarcodeLookupResult = {
    found: boolean;
    barcode: string;
    source: "master" | "web" | "none";
    masterProduct?: MasterProductDto;
    web?: BarcodeWebLookup;
    name: string | null;
    description: string | null;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
    unit: string | null;
    sources: string[];
};

function barcodeVariants(raw: string): string[] {
    const trimmed = raw.trim().replace(/\s+/g, "");
    const stripped = trimmed.replace(/^0+/, "") || trimmed;
    return [...new Set([trimmed, stripped, stripped.padStart(12, "0"), stripped.padStart(13, "0")])];
}

async function findMasterByBarcode(barcode: string) {
    const variants = barcodeVariants(barcode);
    for (const v of variants) {
        const [row] = await db
            .select()
            .from(masterProducts)
            .where(eq(masterProducts.barcode, v))
            .limit(1);
        if (row) return row;
    }

    const [fuzzy] = await db
        .select()
        .from(masterProducts)
        .where(
            or(
                ...variants.map((v) => ilike(masterProducts.barcode, v))
            )
        )
        .limit(1);
    return fuzzy ?? null;
}

/**
 * 1) Exact barcode match in master catalog
 * 2) Parallel public web APIs (UPCitemdb, Open*Facts, …)
 */
export async function lookupBarcodeForCatalog(
    barcodeRaw: string
): Promise<CatalogBarcodeLookupResult> {
    const barcode = barcodeRaw.trim().replace(/\s+/g, "");
    if (!barcode) {
        return emptyResult(barcodeRaw);
    }

    const masterRow = await findMasterByBarcode(barcode);
    if (masterRow) {
        const [enriched] = await enrichMasterProductRows([masterRow]);
        if (enriched) return masterHit(barcode, enriched);
    }

    const web = await lookupBarcodeFromWeb(barcode);

    if (web.found) {
        return {
            found: true,
            barcode: web.barcode,
            source: "web",
            web,
            name: web.name,
            description: web.description,
            brand: web.brand,
            category: web.category,
            imageUrl: web.imageUrl,
            unit: web.unit,
            sources: web.sources,
        };
    }

    return emptyResult(barcode);
}

function masterHit(
    barcode: string,
    product: MasterProductDto
): CatalogBarcodeLookupResult {
    return {
        found: true,
        barcode,
        source: "master",
        masterProduct: product,
        name: product.name,
        description: product.description,
        brand: null,
        category: product.categoryName,
        imageUrl: product.imageSrc,
        unit: product.unit,
        sources: ["Master catalog"],
    };
}

function emptyResult(barcode: string): CatalogBarcodeLookupResult {
    return {
        found: false,
        barcode,
        source: "none",
        name: null,
        description: null,
        brand: null,
        category: null,
        imageUrl: null,
        unit: null,
        sources: [],
    };
}
