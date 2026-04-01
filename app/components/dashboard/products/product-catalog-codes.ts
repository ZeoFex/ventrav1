/**
 * SKU generation and barcode payload encoding for catalog / POS.
 * QR codes embed JSON so scanners can recover product identity and key fields.
 */

export const PRODUCT_BARCODE_SCHEMA_VERSION = 1 as const;

export type ProductBarcodePayloadV1 = {
  v: typeof PRODUCT_BARCODE_SCHEMA_VERSION;
  /** Provisional client id until persisted server-side */
  id: string;
  sku: string;
  /** Short name */
  n?: string;
  /** Price in GHS */
  p?: number;
  /** Category id */
  c?: string;
};

export function generateClientProductId(): string {
  return `pr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Human-readable SKU: VTR-{time base36}-{random} */
export function generateProductSku(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `VTR-${ts}-${rand}`;
}

export function buildProductBarcodePayload(input: {
  id: string;
  sku: string;
  name?: string;
  priceGhs?: number;
  categoryId?: string;
}): string {
  const sku = input.sku.trim();
  const payload: ProductBarcodePayloadV1 = {
    v: PRODUCT_BARCODE_SCHEMA_VERSION,
    id: input.id,
    sku,
    ...(input.name?.trim() ? { n: input.name.trim() } : {}),
    ...(typeof input.priceGhs === "number" &&
    !Number.isNaN(input.priceGhs) &&
    input.priceGhs >= 0
      ? { p: roundMoney(input.priceGhs) }
      : {}),
    ...(input.categoryId?.trim() ? { c: input.categoryId.trim() } : {}),
  };
  return JSON.stringify(payload);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Parse payload from a QR scan (or pasted JSON string). */
export function parseProductBarcodePayload(
  raw: string,
): ProductBarcodePayloadV1 | null {
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    if (rec.v !== 1) return null;
    if (typeof rec.id !== "string" || typeof rec.sku !== "string") return null;
    return o as ProductBarcodePayloadV1;
  } catch {
    return null;
  }
}
