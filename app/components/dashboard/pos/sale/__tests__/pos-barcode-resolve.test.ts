import { describe, expect, it } from "vitest";
import type { ProductRow } from "../../../products/types";
import { resolveProductFromScan } from "../pos-barcode-resolve";

function product(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: "p1",
    name: "Cola",
    sku: "COLA",
    categoryId: null,
    tagIds: [],
    priceGhs: 5,
    stock: 10,
    reorderAt: 1,
    status: "active",
    barcode: "5449000009746",
    ...overrides,
  };
}

describe("resolveProductFromScan", () => {
  it("returns the scanned digits unchanged", () => {
    const result = resolveProductFromScan("5449000009746", [product()]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.normalizedBarcode).toBe("5449000009746");
  });

  it("matches a UPC stored without the EAN-13 leading zero", () => {
    const result = resolveProductFromScan("0036000291452", [
      product({ barcode: "036000291452" }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.normalizedBarcode).toBe("0036000291452");
      expect(result.variationId).toBeUndefined();
    }
  });

  it("attaches the variation that owns the barcode", () => {
    const result = resolveProductFromScan("VAR-100", [
      product({
        barcode: "5449000009746",
        variations: [
          {
            id: "v1",
            name: "500ml",
            type: "size",
            stock: 4,
            barcode: "VAR-100",
          },
        ],
      }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.variationId).toBe("v1");
  });
});
