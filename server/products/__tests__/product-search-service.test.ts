import { describe, it, expect } from "vitest";

/**
 * Unit tests for relevance scoring logic used in product search.
 * Mirrors the scoring in product-search-service.ts without DB access.
 */
function scoreMatch(
    query: string,
    fields: { value: string | null | undefined; weight: number; label: string }[],
): { score: number; matchField: string } | null {
    const q = query.toLowerCase();
    let best: { score: number; matchField: string } | null = null;

    for (const { value, weight, label } of fields) {
        if (!value) continue;
        const v = value.toLowerCase();
        if (v === q) {
            const score = weight;
            if (!best || score < best.score) best = { score, matchField: label };
        } else if (v.startsWith(q)) {
            const score = weight + 10;
            if (!best || score < best.score) best = { score, matchField: label };
        } else if (v.includes(q)) {
            const score = weight + 50;
            if (!best || score < best.score) best = { score, matchField: label };
        }
    }

    return best;
}

function rankProducts(
    query: string,
    products: {
        name: string;
        sku: string;
        barcode?: string | null;
        categoryName?: string | null;
        subcategoryName?: string | null;
    }[],
) {
    const q = query.toLowerCase();
    return products
        .map((row) => {
            const match = scoreMatch(q, [
                { value: row.name, weight: 1, label: "name" },
                { value: row.sku, weight: 2, label: "sku" },
                { value: row.barcode, weight: 3, label: "barcode" },
                { value: row.categoryName, weight: 20, label: "category" },
                { value: row.subcategoryName, weight: 25, label: "subcategory" },
            ]);
            if (!match) return null;
            return { ...row, relevance: match.score, matchField: match.matchField };
        })
        .filter(Boolean)
        .sort((a, b) => (a!.relevance - b!.relevance) || a!.name.localeCompare(b!.name));
}

describe("product search relevance ranking", () => {
    const catalog = [
        { name: "Amoxicillin 500mg", sku: "AMX-500", barcode: "123", categoryName: "Antibiotics" },
        { name: "Amoxyclav 625", sku: "AMO-625", barcode: "456", categoryName: "Antibiotics" },
        { name: "Laptop HP 15", sku: "LAP-HP15", barcode: "789", categoryName: "Laptops" },
        { name: "Laptop Charger 65W", sku: "LAP-CHG65", barcode: "101", categoryName: "Computer Accessories" },
        { name: "Laptop Bag", sku: "BAG-LAP", barcode: "102", categoryName: "Computer Accessories" },
    ];

    it("ranks prefix name matches for amo query", () => {
        const results = rankProducts("amo", catalog);
        expect(results.map((r) => r!.name)).toEqual([
            "Amoxicillin 500mg",
            "Amoxyclav 625",
        ]);
    });

    it("ranks lap query with name prefix matches first", () => {
        const results = rankProducts("lap", catalog);
        const names = results.map((r) => r!.name);
        expect(names[0]).toMatch(/^Laptop/);
        expect(names).toContain("Laptop Charger 65W");
        expect(names).toContain("Laptop Bag");
    });

    it("prefers exact name match over category partial match", () => {
        const results = rankProducts("antibiotics", [
            { name: "Generic Tablet", sku: "GEN-1", categoryName: "Antibiotics" },
            { name: "Antibiotics Pack", sku: "AB-1", categoryName: "OTC" },
        ]);
        expect(results[0]!.name).toBe("Antibiotics Pack");
    });
});
