import { parseProductBarcodePayload } from "@/app/components/dashboard/products/product-catalog-codes";
import { type ProductRow } from "../../products/types";

export type ResolveScanResult =
  | { ok: true; product: ProductRow; variationId?: string }
  | { ok: false; message: string };

export function resolveProductFromScan(
  raw: string,
  products: ProductRow[],
): ResolveScanResult {
  const trimmed = raw.trim();
  console.log(`[resolve] input: "${trimmed}" (${trimmed.length} chars)`);

  if (!trimmed) {
    return { ok: false, message: "Empty scan" };
  }

  const json = parseProductBarcodePayload(trimmed);
  if (json) {
    console.log(`[resolve] parsed as JSON payload → id="${json.id}" sku="${json.sku}"`);
    const byId = products.find((p) => p.id === json.id);
    if (byId) {
      console.log(`[resolve] ✅ matched by id → "${byId.name}"`);
      return { ok: true, product: byId };
    }
    const sku = json.sku.trim().toUpperCase();

    // Check products by SKU
    const bySku = products.find((p) => p.sku.toUpperCase() === sku);
    if (bySku) {
      console.log(`[resolve] ✅ matched by sku → "${bySku.name}"`);
      return { ok: true, product: bySku };
    }

    // Check variations by SKU
    for (const p of products) {
      if (p.variations) {
        const v = p.variations.find(v => v.sku?.toUpperCase() === sku);
        if (v) {
          console.log(`[resolve] ✅ matched variation by SKU → "${p.name} (${v.name})"`);
          return { ok: true, product: p, variationId: v.id };
        }
      }
    }

    console.log(`[resolve] ❌ JSON payload id/sku not found in catalog`);
    return { ok: false, message: "Product not in this register’s catalog" };
  }

  console.log(`[resolve] not JSON — trying raw SKU/Barcode match: "${trimmed.toUpperCase()}"`);
  const matchStr = trimmed.toUpperCase();

  // 1. Direct product SKU match
  const bySku = products.find((p) => p.sku.toUpperCase() === matchStr);
  if (bySku) {
    console.log(`[resolve] ✅ matched by SKU → "${bySku.name}"`);
    return { ok: true, product: bySku };
  }

  // 2. Direct product Barcode match
  // (barcode field is on ProductRow if we added it, let's check types)
  // Products table HAS barcode. Let's see if the type has it.
  const byBarcode = products.find((p: any) => p.barcode?.toUpperCase() === matchStr);
  if (byBarcode) {
    console.log(`[resolve] ✅ matched by Barcode → "${byBarcode.name}"`);
    return { ok: true, product: byBarcode };
  }

  // 3. Variation SKU or Barcode match
  for (const p of products) {
    if (p.variations) {
      const v = p.variations.find(v => 
        v.sku?.toUpperCase() === matchStr || 
        v.barcode?.toUpperCase() === matchStr
      );
      if (v) {
        console.log(`[resolve] ✅ matched variation → "${p.name} (${v.name})"`);
        return { ok: true, product: p, variationId: v.id };
      }
    }
  }

  console.log(`[resolve] ❌ no match found`);
  return { ok: false, message: "Unknown barcode — try search or check SKU" };
}
