/**
 * Normalize a raw scan into a clean lookup key and retail barcode variants (UPC/EAN).
 */
export function normalizeScannedBarcode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/** Build candidate strings for catalog lookup (UPC-A ↔ EAN-13, case, digits-only). */
export function barcodeLookupVariants(raw: string): string[] {
  const normalized = normalizeScannedBarcode(raw);
  if (!normalized) return [];

  const variants = new Set<string>();
  variants.add(normalized);
  variants.add(normalized.toUpperCase());

  const digits = normalized.replace(/\D/g, "");
  if (digits) {
    variants.add(digits);
    // UPC-A (12 digits) often scans as EAN-13 with leading zero
    if (digits.length === 12) {
      variants.add(`0${digits}`);
    }
    if (digits.length === 13 && digits.startsWith("0")) {
      variants.add(digits.slice(1));
    }
    // Some scanners drop check digit or pad — try without last digit if 13+
    if (digits.length === 14) {
      variants.add(digits.slice(0, 13));
      variants.add(digits.slice(1, 14));
    }
  }

  return [...variants];
}

export const POS_BARCODE_NOT_FOUND_MESSAGE =
  "No matching item found. Would you like to create a new product using this barcode?";
