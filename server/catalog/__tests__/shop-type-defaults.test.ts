import { describe, it, expect } from "vitest";
import {
    resolveShopTypeSlug,
    SHOP_TYPE_DEFAULT_CATEGORIES,
    slugifyCategoryName,
    type ShopTypeSlug,
} from "../shop-type-defaults";

describe("resolveShopTypeSlug", () => {
    it("maps legacy business types to current shop type slugs", () => {
        expect(resolveShopTypeSlug("agro_chemicals")).toBe("agrochemical_shop");
        expect(resolveShopTypeSlug("boutique")).toBe("boutique_fashion");
        expect(resolveShopTypeSlug("electronics")).toBe("electronics_store");
        expect(resolveShopTypeSlug("retail")).toBe("general_retail_store");
        expect(resolveShopTypeSlug("mini_mart")).toBe("supermarket");
    });

    it("defaults unknown types to general_retail_store", () => {
        expect(resolveShopTypeSlug(null)).toBe("general_retail_store");
        expect(resolveShopTypeSlug("unknown_type")).toBe("general_retail_store");
    });

    it("passes through current slugs unchanged", () => {
        const slugs: ShopTypeSlug[] = ["pharmacy", "cold_store", "hardware_store"];
        for (const slug of slugs) {
            expect(resolveShopTypeSlug(slug)).toBe(slug);
        }
    });
});

describe("SHOP_TYPE_DEFAULT_CATEGORIES", () => {
    it("defines categories for all 12 shop types", () => {
        expect(Object.keys(SHOP_TYPE_DEFAULT_CATEGORIES)).toHaveLength(12);
    });

    it("includes pharmacy defaults from spec", () => {
        expect(SHOP_TYPE_DEFAULT_CATEGORIES.pharmacy).toContain("Antibiotics");
        expect(SHOP_TYPE_DEFAULT_CATEGORIES.pharmacy).toContain(
            "Vitamins & Supplements",
        );
    });

    it("includes electronics store defaults from spec", () => {
        expect(SHOP_TYPE_DEFAULT_CATEGORIES.electronics_store).toContain("Laptops");
        expect(SHOP_TYPE_DEFAULT_CATEGORIES.electronics_store).toContain(
            "Smartphones",
        );
    });
});

describe("slugifyCategoryName", () => {
    it("creates URL-safe slugs", () => {
        expect(slugifyCategoryName("Vitamins & Supplements")).toBe(
            "vitamins-supplements",
        );
        expect(slugifyCategoryName("Men's Clothing")).toBe("men-s-clothing");
    });
});
