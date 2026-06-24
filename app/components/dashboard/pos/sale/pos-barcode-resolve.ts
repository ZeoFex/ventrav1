import { parseProductBarcodePayload } from "@/app/components/dashboard/products/product-catalog-codes";
import {
  barcodeLookupVariants,
  normalizeScannedBarcode,
  POS_BARCODE_NOT_FOUND_MESSAGE,
} from "@/app/lib/pos/barcode-scanner/normalize";
import { type ProductRow } from "../../products/types";

export type ResolveScanResult =
  | { ok: true; product: ProductRow; normalizedBarcode: string }
  | { ok: false; message: string; normalizedBarcode: string };

function matchesAnyVariant(value: string | null | undefined, variants: Set<string>): boolean {
  if (!value) return false;
  const cleaned = normalizeScannedBarcode(value);
  if (variants.has(cleaned) || variants.has(cleaned.toUpperCase())) return true;
  const digits = cleaned.replace(/\D/g, "");
  return digits.length > 0 && variants.has(digits);
}

/**
 * Resolve a scanned barcode against the current register catalog (business/branch products).
 * Tries product barcode, SKU, variation barcodes, and Ventra JSON QR payloads.
 */
export function resolveProductFromScan(
  raw: string,
  products: ProductRow[],
): ResolveScanResult {
  const normalized = normalizeScannedBarcode(raw);
  if (!normalized) {
    return { ok: false, message: "Empty scan", normalizedBarcode: "" };
  }

  const variants = new Set<string>();
  for (const v of barcodeLookupVariants(normalized)) {
    variants.add(v);
    variants.add(v.toUpperCase());
    const digits = v.replace(/\D/g, "");
    if (digits) variants.add(digits);
  }

  const json = parseProductBarcodePayload(normalized);
  if (json) {
    const byId = products.find((p) => p.id === json.id);
    if (byId) {
      return { ok: true, product: byId, normalizedBarcode: normalized };
    }
    const sku = json.sku.trim().toUpperCase();
    const bySku = products.find((p) => p.sku.toUpperCase() === sku);
    if (bySku) {
      return { ok: true, product: bySku, normalizedBarcode: normalized };
    }
    return {
      ok: false,
      message: POS_BARCODE_NOT_FOUND_MESSAGE,
      normalizedBarcode: normalized,
    };
  }

  for (const p of products) {
    if (matchesAnyVariant(p.sku, variants)) {
      return { ok: true, product: p, normalizedBarcode: normalized };
    }
    if (matchesAnyVariant(p.barcode, variants)) {
      return { ok: true, product: p, normalizedBarcode: normalized };
    }
    for (const v of p.variations ?? []) {
      if (matchesAnyVariant(v.sku, variants) || matchesAnyVariant(v.barcode, variants)) {
        return { ok: true, product: p, normalizedBarcode: normalized };
      }
    }
  }

  return {
    ok: false,
    message: POS_BARCODE_NOT_FOUND_MESSAGE,
    normalizedBarcode: normalized,
  };
}

export { POS_BARCODE_NOT_FOUND_MESSAGE };
