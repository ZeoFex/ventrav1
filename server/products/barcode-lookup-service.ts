/**
 * Multi-source barcode lookup — queries public product APIs in parallel
 * and merges the best name, image, and metadata available.
 */

export type BarcodeWebLookup = {
    found: boolean;
    barcode: string;
    name: string | null;
    description: string | null;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
    unit: string | null;
    /** APIs that contributed data */
    sources: string[];
};

type PartialFields = {
    name?: string | null;
    description?: string | null;
    brand?: string | null;
    category?: string | null;
    imageUrl?: string | null;
    unit?: string | null;
};

const FETCH_TIMEOUT_MS = 8000;

function normalizeBarcode(raw: string): string {
    return raw.trim().replace(/\s+/g, "");
}

function isHttpsUrl(value: string | null | undefined): value is string {
    return typeof value === "string" && /^https:\/\/.+/i.test(value.trim());
}

function pickName(...candidates: (string | null | undefined)[]): string | null {
    for (const c of candidates) {
        const v = (c ?? "").trim();
        if (v.length >= 2) return v;
    }
    return null;
}

function mergeFields(
    base: PartialFields,
    patch: PartialFields,
    source: string,
    sources: string[]
): PartialFields {
    const out = { ...base };
    let contributed = false;

    if (!out.name && patch.name) {
        out.name = patch.name;
        contributed = true;
    }
    if (!out.imageUrl && patch.imageUrl) {
        out.imageUrl = patch.imageUrl;
        contributed = true;
    }
    if (!out.description && patch.description) {
        out.description = patch.description;
        contributed = true;
    }
    if (!out.brand && patch.brand) {
        out.brand = patch.brand;
        contributed = true;
    }
    if (!out.category && patch.category) {
        out.category = patch.category;
        contributed = true;
    }
    if (!out.unit && patch.unit) {
        out.unit = patch.unit;
        contributed = true;
    }

    if (contributed && !sources.includes(source)) {
        sources.push(source);
    }
    return out;
}

async function fetchJson(url: string): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                "User-Agent": "VentraPOS/1.0 (product-catalog-lookup)",
            },
            cache: "no-store",
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function lookupUpcItemDb(barcode: string): Promise<PartialFields | null> {
    const data = (await fetchJson(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(barcode)}`
    )) as {
        code?: string;
        items?: Array<{
            title?: string;
            description?: string;
            brand?: string;
            category?: string;
            images?: string[];
        }>;
    } | null;

    if (!data || data.code !== "OK" || !data.items?.length) return null;
    const item = data.items[0];
    const imageUrl = item.images?.find((u) => isHttpsUrl(u)) ?? null;
    return {
        name: pickName(item.title),
        description: (item.description ?? "").trim() || null,
        brand: (item.brand ?? "").trim() || null,
        category: (item.category ?? "").trim() || null,
        imageUrl,
    };
}

type OpenFactsProduct = {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    generic_name_en?: string;
    brands?: string;
    categories?: string;
    quantity?: string;
    image_url?: string;
    image_front_url?: string;
    selected_images?: {
        front?: { display?: { en?: string } };
    };
};

async function lookupOpenFactsHost(
    host: string,
    label: string,
    barcode: string
): Promise<PartialFields | null> {
    const data = (await fetchJson(
        `https://${host}/api/v2/product/${encodeURIComponent(barcode)}.json`
    )) as { status?: number; product?: OpenFactsProduct } | null;

    if (!data || data.status !== 1 || !data.product) return null;
    const p = data.product;
    const imageUrl = pickName(
        p.image_front_url,
        p.selected_images?.front?.display?.en,
        p.image_url
    );
    const categoryRaw = (p.categories ?? "").split(",").pop()?.trim();

    return {
        name: pickName(p.product_name, p.product_name_en, p.generic_name, p.generic_name_en),
        description: [p.brands, p.quantity].filter(Boolean).join(" · ") || null,
        brand: (p.brands ?? "").trim() || null,
        category: categoryRaw || null,
        imageUrl: isHttpsUrl(imageUrl) ? imageUrl : null,
        unit: (p.quantity ?? "").trim() || null,
    };
}

/** Query multiple public barcode databases; merge best available fields. */
export async function lookupBarcodeFromWeb(barcodeRaw: string): Promise<BarcodeWebLookup> {
    const barcode = normalizeBarcode(barcodeRaw);
    if (!barcode) {
        return {
            found: false,
            barcode: barcodeRaw,
            name: null,
            description: null,
            brand: null,
            category: null,
            imageUrl: null,
            unit: null,
            sources: [],
        };
    }

    const sources: string[] = [];
    let merged: PartialFields = {};

    const lookups = await Promise.allSettled([
        lookupUpcItemDb(barcode).then((r) => ({ source: "UPCitemdb", data: r })),
        lookupOpenFactsHost("world.openfoodfacts.org", "Open Food Facts", barcode).then(
            (r) => ({ source: "Open Food Facts", data: r })
        ),
        lookupOpenFactsHost("world.openbeautyfacts.org", "Open Beauty Facts", barcode).then(
            (r) => ({ source: "Open Beauty Facts", data: r })
        ),
        lookupOpenFactsHost("world.openproductsfacts.org", "Open Products Facts", barcode).then(
            (r) => ({ source: "Open Products Facts", data: r })
        ),
    ]);

    for (const result of lookups) {
        if (result.status !== "fulfilled" || !result.value.data) continue;
        merged = mergeFields(merged, result.value.data, result.value.source, sources);
    }

    const found = Boolean(merged.name || merged.imageUrl);

    return {
        found,
        barcode,
        name: merged.name ?? null,
        description: merged.description ?? null,
        brand: merged.brand ?? null,
        category: merged.category ?? null,
        imageUrl: merged.imageUrl ?? null,
        unit: merged.unit ?? null,
        sources,
    };
}
