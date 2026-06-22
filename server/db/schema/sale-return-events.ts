import {
    pgTable,
    uuid,
    integer,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { sales, saleItems } from "./sales";
import { products, productVariations } from "./products";
import { users } from "./users";

/** Immutable log of units restocked via customer returns (for period reporting). */
export const saleReturnEvents = pgTable(
    "sale_return_events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        saleId: uuid("sale_id")
            .notNull()
            .references(() => sales.id, { onDelete: "cascade" }),
        saleItemId: uuid("sale_item_id")
            .notNull()
            .references(() => saleItems.id, { onDelete: "cascade" }),
        productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
        variationId: uuid("variation_id").references(() => productVariations.id, {
            onDelete: "set null",
        }),
        quantity: integer("quantity").notNull(),
        userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("sale_return_events_business_id_idx").on(t.businessId),
        index("sale_return_events_product_id_idx").on(t.productId),
        index("sale_return_events_created_at_idx").on(t.createdAt),
        index("sale_return_events_branch_id_idx").on(t.branchId),
    ],
);
