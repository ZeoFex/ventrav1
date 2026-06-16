/**
 * Idempotent seed for shop_types reference table.
 * Run: npx tsx scripts/seed-shop-types.ts
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../server/db";
import { shopTypes } from "../server/db/schema/shop-types";
import {
    SHOP_TYPE_LABELS,
    type ShopTypeSlug,
} from "../server/catalog/shop-type-defaults";

async function main() {
    const slugs = Object.keys(SHOP_TYPE_LABELS) as ShopTypeSlug[];

    for (const slug of slugs) {
        await db
            .insert(shopTypes)
            .values({ slug, name: SHOP_TYPE_LABELS[slug] })
            .onConflictDoNothing({ target: shopTypes.slug });
    }

    console.log(`Seeded ${slugs.length} shop types.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
