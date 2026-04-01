import { parseProductBarcodePayload } from "@/app/components/dashboard/products/product-catalog-codes";
import { type ProductRow } from "../../products/types";

export type ResolveScanResult =
  | { ok: true; product: ProductRow }
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
    const bySku = products.find((p) => p.sku.toUpperCase() === sku);
    if (bySku) {
      console.log(`[resolve] ✅ matched by sku → "${bySku.name}"`);
      return { ok: true, product: bySku };
    }
    console.log(`[resolve] ❌ JSON payload id/sku not found in catalog`);
    return { ok: false, message: "Product not in this register’s catalog" };
  }

  console.log(`[resolve] not JSON — trying raw SKU match: "${trimmed.toUpperCase()}"`);
  const sku = trimmed.toUpperCase();
  const bySku = products.find((p) => p.sku.toUpperCase() === sku);
  if (bySku) {
    console.log(`[resolve] ✅ matched by SKU → "${bySku.name}"`);
    return { ok: true, product: bySku };
  }

  console.log(`[resolve] ❌ no match found`);
  return { ok: false, message: "Unknown barcode — try search or check SKU" };
}
