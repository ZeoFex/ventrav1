import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { searchProducts } from "@/server/products/product-search-service";

vi.mock("@/server/auth/api-request-auth", () => ({
    requireUserAuthFromContext: vi.fn().mockResolvedValue({
        payload: { bid: "biz-1", sub: "user-1" },
    }),
}));

vi.mock("@/server/auth/get-branch-id", () => ({
    getActiveBranchIdFromContext: vi.fn().mockResolvedValue("branch-1"),
}));

vi.mock("@/server/products/product-search-service", () => ({
    searchProducts: vi.fn(),
}));

describe("GET /api/products/search", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 when query is missing", async () => {
        const req = new NextRequest("http://localhost/api/products/search");
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it("returns ranked results for valid query", async () => {
        vi.mocked(searchProducts).mockResolvedValue([
            {
                id: "p1",
                name: "Amoxicillin",
                sku: "AMX-1",
                barcode: null,
                priceGhs: "10.00",
                stock: 5,
                categoryId: null,
                categoryName: null,
                subcategoryId: null,
                subcategoryName: null,
                relevance: 1,
                matchField: "name",
            },
        ]);

        const req = new NextRequest("http://localhost/api/products/search?q=amo");
        const res = await GET(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.query).toBe("amo");
        expect(data.results).toHaveLength(1);
        expect(searchProducts).toHaveBeenCalledWith("biz-1", "branch-1", "amo", 20);
    });
});
