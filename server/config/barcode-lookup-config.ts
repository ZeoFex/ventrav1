/**
 * Optional barcode lookup API settings (read from env; all have safe defaults).
 * Trial UPCitemdb needs no key. Set UPCITEMDB_USER_KEY to switch to paid /prod/v1.
 */

function trimOrUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed || undefined;
}

export const barcodeLookupConfig = {
    upcItemDb: {
        lookupUrl:
            trimOrUndefined(process.env.UPCITEMDB_LOOKUP_URL) ??
            "https://api.upcitemdb.com/prod/trial/lookup",
        searchUrl:
            trimOrUndefined(process.env.UPCITEMDB_SEARCH_URL) ??
            "https://api.upcitemdb.com/prod/trial/search",
        userKey: trimOrUndefined(process.env.UPCITEMDB_USER_KEY),
        keyType: process.env.UPCITEMDB_KEY_TYPE?.trim() || "3scale",
    },
    openFoodFactsHost:
        trimOrUndefined(process.env.OPEN_FOOD_FACTS_HOST) ??
        "world.openfoodfacts.org",
    openBeautyFactsHost:
        trimOrUndefined(process.env.OPEN_BEAUTY_FACTS_HOST) ??
        "world.openbeautyfacts.org",
    openProductsFactsHost:
        trimOrUndefined(process.env.OPEN_PRODUCTS_FACTS_HOST) ??
        "world.openproductsfacts.org",
    barcodeLookupApiKey: trimOrUndefined(process.env.BARCODE_LOOKUP_API_KEY),
    goUpcApiKey: trimOrUndefined(process.env.GO_UPC_API_KEY),
    eanSearchToken: trimOrUndefined(process.env.EAN_SEARCH_API_TOKEN),
} as const;

export function upcItemDbLookupUrl(barcode: string): string {
    const { lookupUrl, userKey } = barcodeLookupConfig.upcItemDb;
    const base = userKey
        ? "https://api.upcitemdb.com/prod/v1/lookup"
        : lookupUrl.replace(/\/$/, "");
    const joiner = base.includes("?") ? "&" : "?";
    return `${base}${joiner}upc=${encodeURIComponent(barcode)}`;
}

export function upcItemDbRequestHeaders(): Record<string, string> {
    const { userKey, keyType } = barcodeLookupConfig.upcItemDb;
    const headers: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "VentraPOS/1.0 (product-catalog-lookup)",
    };
    if (userKey) {
        headers.user_key = userKey;
        headers.key_type = keyType;
    }
    return headers;
}
