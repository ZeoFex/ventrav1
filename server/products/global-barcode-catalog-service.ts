import { eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { globalBarcodeCatalog } from "@/server/db/schema/products";

export type GlobalBarcodeCatalogEntry = {
    id: string;
    barcode: string;
    productName: string;
    description: string | null;
    imageSrc: string | null;
    unit: string | null;
    sourceBusinessName: string | null;
    contributionCount: number;
    updatedAt: Date;
};

/** Canonical storage form — digits for numeric retail codes, else trimmed uppercase. */
export function canonicalBarcodeKey(raw: string): string {
    const trimmed = raw.trim().replace(/\s+/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 14) {
        return digits;
    }
    return trimmed.toUpperCase();
}

export function barcodeLookupKeys(raw: string): string[] {
    const canonical = canonicalBarcodeKey(raw);
    const keys = new Set<string>([canonical]);
    if (canonical.length === 12) keys.add(`0${canonical}`);
    if (canonical.length === 13 && canonical.startsWith("0")) {
        keys.add(canonical.slice(1));
    }
    return [...keys];
}

export async function lookupGlobalBarcode(
    raw: string,
): Promise<GlobalBarcodeCatalogEntry | null> {
    const keys = barcodeLookupKeys(raw);
    if (keys.length === 0) return null;

    const [row] = await db
        .select({
            id: globalBarcodeCatalog.id,
            barcode: globalBarcodeCatalog.barcode,
            productName: globalBarcodeCatalog.productName,
            description: globalBarcodeCatalog.description,
            imageSrc: globalBarcodeCatalog.imageSrc,
            unit: globalBarcodeCatalog.unit,
            sourceBusinessName: globalBarcodeCatalog.sourceBusinessName,
            contributionCount: globalBarcodeCatalog.contributionCount,
            updatedAt: globalBarcodeCatalog.updatedAt,
        })
        .from(globalBarcodeCatalog)
        .where(inArray(globalBarcodeCatalog.barcode, keys))
        .limit(1);

    return row ?? null;
}

export type UpsertGlobalBarcodeInput = {
    barcode: string;
    productName: string;
    description?: string | null;
    imageSrc?: string | null;
    unit?: string | null;
    sourceBusinessId: string;
    sourceBusinessName?: string | null;
};

/** Insert or refresh metadata when a business saves a product with a barcode. */
export async function upsertGlobalBarcodeEntry(input: UpsertGlobalBarcodeInput): Promise<void> {
    const barcode = canonicalBarcodeKey(input.barcode);
    if (!barcode || barcode.length < 4) return;

    const productName = input.productName.trim();
    if (!productName) return;

    const now = new Date();

    await db
        .insert(globalBarcodeCatalog)
        .values({
            barcode,
            productName,
            description: input.description?.trim() || null,
            imageSrc: input.imageSrc?.trim() || null,
            unit: input.unit?.trim() || null,
            sourceBusinessId: input.sourceBusinessId,
            sourceBusinessName: input.sourceBusinessName?.trim() || null,
            contributionCount: 1,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: globalBarcodeCatalog.barcode,
            set: {
                productName,
                description: input.description?.trim() || null,
                imageSrc: input.imageSrc?.trim() || null,
                unit: input.unit?.trim() || null,
                sourceBusinessId: input.sourceBusinessId,
                sourceBusinessName: input.sourceBusinessName?.trim() || null,
                contributionCount: sql`${globalBarcodeCatalog.contributionCount} + 1`,
                updatedAt: now,
            },
        });
}
