import { describe, expect, it } from "vitest";
import type { ProductRow } from "@/app/components/dashboard/products/types";
import {
    applySoldToCatalog,
    catalogStockIsOnParent,
    onHandForLine,
} from "../apply-sold-stock";

function product(overrides: Partial<ProductRow> = {}): ProductRow {
    return {
        id: "p1",
        name: "Bulk rice",
        sku: "SKU-1",
        categoryId: null,
        tagIds: [],
        priceGhs: 10,
        stock: 30,
        reorderAt: 0,
        status: "active",
        ...overrides,
    };
}

describe("catalogStockIsOnParent", () => {
    it("uses parent stock when bulk-import variations are all 0", () => {
        const p = product({
            variations: [
                { id: "v1", name: "Default", type: "Size", stock: 0 },
                { id: "v2", name: "Large", type: "Size", stock: 0 },
            ],
        });
        expect(catalogStockIsOnParent(p)).toBe(true);
        expect(onHandForLine(p)).toBe(30);
    });

    it("uses variation stock when sizes actually have inventory", () => {
        const p = product({
            stock: 0,
            variations: [
                { id: "v1", name: "S", type: "Size", stock: 4 },
                { id: "v2", name: "M", type: "Size", stock: 6 },
            ],
        });
        expect(catalogStockIsOnParent(p)).toBe(false);
        expect(onHandForLine(p)).toBe(10);
        expect(onHandForLine(p, "v1")).toBe(4);
    });
});

describe("applySoldToCatalog", () => {
    it("decrements parent stock for bulk-import products even if a variation id is present", () => {
        const catalog = [
            product({
                variations: [{ id: "v1", name: "Default", type: "Size", stock: 0 }],
            }),
        ];
        const next = applySoldToCatalog(catalog, [
            { productId: "p1", variationId: "v1", qty: 1 },
        ]);
        expect(next[0]?.stock).toBe(29);
        expect(next[0]?.variations?.[0]?.stock).toBe(0);
    });

    it("decrements the selected variation when that variation holds stock", () => {
        const catalog = [
            product({
                stock: 0,
                variations: [
                    { id: "v1", name: "S", type: "Size", stock: 4 },
                    { id: "v2", name: "M", type: "Size", stock: 6 },
                ],
            }),
        ];
        const next = applySoldToCatalog(catalog, [
            { productId: "p1", variationId: "v1", qty: 1 },
        ]);
        expect(next[0]?.stock).toBe(0);
        expect(next[0]?.variations?.[0]?.stock).toBe(3);
        expect(next[0]?.variations?.[1]?.stock).toBe(6);
    });
});
