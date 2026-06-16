/**
 * Seeds default categories and subcategories for a business based on shop type.
 */
import { and, eq } from "drizzle-orm";
import { db, type Database } from "../db";
import { categories, subcategories } from "../db/schema/products";
import {
    resolveShopTypeSlug,
    SHOP_TYPE_DEFAULT_CATEGORIES,
    SHOP_TYPE_DEFAULT_SUBCATEGORIES,
    slugifyCategoryName,
    type ShopTypeSlug,
} from "../catalog/shop-type-defaults";

export interface SeedCategoriesInput {
    businessId: string;
    branchId: string;
    businessType: string | null;
    /** Skip if business already has categories for this branch. */
    skipIfExists?: boolean;
}

export interface SeedCategoriesResult {
    categoriesCreated: number;
    subcategoriesCreated: number;
    skipped: boolean;
}

/** DB client or transaction — only the query methods this service uses. */
type CategorySeedExecutor = Pick<Database, "select" | "insert">;

export async function seedDefaultCategoriesForBusiness(
    input: SeedCategoriesInput,
    executor: CategorySeedExecutor = db,
): Promise<SeedCategoriesResult> {
    const runner = executor;
    const shopType: ShopTypeSlug = resolveShopTypeSlug(input.businessType);

    if (input.skipIfExists) {
        const existing = await runner
            .select({ id: categories.id })
            .from(categories)
            .where(
                and(
                    eq(categories.businessId, input.businessId),
                    eq(categories.branchId, input.branchId),
                ),
            )
            .limit(1);

        if (existing.length > 0) {
            return { categoriesCreated: 0, subcategoriesCreated: 0, skipped: true };
        }
    }

    const categoryNames = SHOP_TYPE_DEFAULT_CATEGORIES[shopType];
    const subcategoryMap = SHOP_TYPE_DEFAULT_SUBCATEGORIES[shopType] ?? {};

    let categoriesCreated = 0;
    let subcategoriesCreated = 0;

    for (const name of categoryNames) {
        const slug = slugifyCategoryName(name);
        const [inserted] = await runner
            .insert(categories)
            .values({
                businessId: input.businessId,
                branchId: input.branchId,
                name,
                slug,
            })
            .returning({ id: categories.id, name: categories.name });

        categoriesCreated++;

        const subs = subcategoryMap[name] ?? [];
        if (subs.length > 0 && inserted) {
            await runner.insert(subcategories).values(
                subs.map((subName) => ({
                    businessId: input.businessId,
                    branchId: input.branchId,
                    categoryId: inserted.id,
                    name: subName,
                    slug: slugifyCategoryName(subName),
                })),
            );
            subcategoriesCreated += subs.length;
        }
    }

    return { categoriesCreated, subcategoriesCreated, skipped: false };
}
