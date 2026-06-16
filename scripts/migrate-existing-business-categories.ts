/**
 * Backfill default categories for existing businesses that have none.
 * Run: npx tsx scripts/migrate-existing-business-categories.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { eq, and } from "drizzle-orm";
import { db } from "../server/db";
import { businesses } from "../server/db/schema/businesses";
import { branches } from "../server/db/schema/branches";
import { categories } from "../server/db/schema/products";
import { seedDefaultCategoriesForBusiness } from "../server/catalog/category-seed-service";
import { resolveShopTypeSlug } from "../server/catalog/shop-type-defaults";

async function main() {
    const allBusinesses = await db
        .select({
            id: businesses.id,
            businessType: businesses.businessType,
            name: businesses.name,
        })
        .from(businesses);

    let seeded = 0;
    let skipped = 0;

    for (const biz of allBusinesses) {
        const [mainBranch] = await db
            .select({ id: branches.id })
            .from(branches)
            .where(and(eq(branches.businessId, biz.id), eq(branches.isMain, true)))
            .limit(1);

        if (!mainBranch) {
            console.warn(`No main branch for business ${biz.name} (${biz.id})`);
            continue;
        }

        const existing = await db
            .select({ id: categories.id })
            .from(categories)
            .where(
                and(
                    eq(categories.businessId, biz.id),
                    eq(categories.branchId, mainBranch.id),
                ),
            )
            .limit(1);

        if (existing.length > 0) {
            skipped++;
            continue;
        }

        const shopType = resolveShopTypeSlug(biz.businessType);
        const result = await seedDefaultCategoriesForBusiness({
            businessId: biz.id,
            branchId: mainBranch.id,
            businessType: shopType,
            skipIfExists: true,
        });

        if (!result.skipped) {
            seeded++;
            console.log(
                `Seeded ${result.categoriesCreated} categories for ${biz.name} (${shopType})`,
            );
        } else {
            skipped++;
        }
    }

    console.log(`Done. Seeded: ${seeded}, skipped: ${skipped}`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
