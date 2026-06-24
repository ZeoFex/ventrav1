/** Temporary storage for scan → Add Product handoff (survives navigation within tab). */

export type PendingProductFromScan = {
    barcode: string;
    productName?: string;
    description?: string;
    imageSrc?: string | null;
    unit?: string | null;
    fromGlobalCatalog?: boolean;
    sourceBusinessName?: string | null;
    capturedAt: number;
};

const STORAGE_KEY = "ventra:pending-product-from-scan";

export function storePendingProductFromScan(
    data: Omit<PendingProductFromScan, "capturedAt">,
): void {
    if (typeof window === "undefined") return;
    const payload: PendingProductFromScan = { ...data, capturedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readPendingProductFromScan(): PendingProductFromScan | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PendingProductFromScan;
        if (!parsed.barcode) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearPendingProductFromScan(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEY);
}

export type GlobalBarcodePrefill = {
    productName: string;
    description?: string | null;
    imageSrc?: string | null;
    unit?: string | null;
    sourceBusinessName?: string | null;
};
