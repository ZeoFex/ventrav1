import { and, asc, eq, ilike } from "drizzle-orm";
import { db } from "../db";
import { branches } from "../db/schema/branches";
import { businesses } from "../db/schema/businesses";
import { categories, products } from "../db/schema/products";
import { saveProduct, generateSku } from "../products/product-service";
import { syncTenantProductToMasterCatalog } from "./master-catalog-service";
import { slugifyCatalog } from "./constants";

export type AddShopProductInput = {
    name: string;
    sku?: string | null;
    barcode?: string | null;
    description?: string | null;
    imageSrc?: string | null;
    priceGhs: string;
    costPriceGhs?: string | null;
    stock?: number;
    unit?: string;
    categoryName?: string | null;
};

async function resolveDefaultBranchId(businessId: string): Promise<string | null> {
    const [main] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.businessId, businessId), eq(branches.isMain, true)))
        .limit(1);
    if (main) return main.id;

    const [anyBranch] = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.businessId, businessId))
        .orderBy(asc(branches.createdAt))
        .limit(1);
    return anyBranch?.id ?? null;
}

async function findCategoryIdForBusiness(
    businessId: string,
    branchId: string,
    categoryName: string | null | undefined
): Promise<string | null> {
    const name = (categoryName ?? "").trim();
    if (!name) return null;

    const [match] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(
            and(
                eq(categories.businessId, businessId),
                ilike(categories.name, name)
            )
        )
        .limit(1);
    if (match) return match.id;

    const slug = slugifyCatalog(name);
    const [created] = await db
        .insert(categories)
        .values({
            businessId,
            branchId,
            name,
            slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
        })
        .returning({ id: categories.id });
    return created?.id ?? null;
}

/**
 * Add a product to a tenant shop inventory and sync into the master catalog.
 * Platform-only — does not change existing POS route handlers.
 */
export async function addProductToShopAndMasterCatalog(
    businessId: string,
    input: AddShopProductInput
) {
    const [biz] = await db
        .select({ id: businesses.id, name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) {
        throw new Error("Shop not found");
    }

    const branchId = await resolveDefaultBranchId(businessId);
    if (!branchId) {
        throw new Error("This shop has no branch. Complete onboarding first.");
    }

    const name = input.name.trim();
    if (!name) {
        throw new Error("Product name is required");
    }

    const priceNum = parseFloat(String(input.priceGhs ?? "").replace(",", "."));
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw new Error("Shop selling price (GHS) is required and must be greater than zero");
    }

    const sku = (input.sku?.trim() || generateSku()).slice(0, 100);
    const slugBase = slugifyCatalog(name) || "product";
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;
    const categoryId = await findCategoryIdForBusiness(
        businessId,
        branchId,
        input.categoryName
    );

    const inserted = await saveProduct({
        businessId,
        branchId,
        categoryId,
        name,
        slug,
        sku,
        barcode: input.barcode?.trim() || null,
        description: input.description?.trim() || null,
        imageSrc: input.imageSrc?.trim() || null,
        priceGhs: String(priceNum),
        costPriceGhs: input.costPriceGhs?.trim() || null,
        stock: Math.max(0, input.stock ?? 0),
        reorderAt: 5,
        unit: input.unit?.trim() || "piece",
        status: "active",
    });

    const master = await syncTenantProductToMasterCatalog(inserted.id, businessId);

    return {
        tenantProductId: inserted.id,
        masterProductId: master?.id ?? null,
        businessName: biz.name,
    };
}
