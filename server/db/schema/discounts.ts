import {
    pgTable,
    uuid,
    varchar,
    decimal,
    boolean,
    timestamp,
    index,
    pgEnum,
    jsonb,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";

export const discountTypeEnum = pgEnum("discount_type", [
    "percentage",
    "fixed",
]);

/** Discounts and promotions */
export const discounts = pgTable(
    "discounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),
        name: varchar("name", { length: 255 }).notNull(),
        type: discountTypeEnum("type").notNull(), // 'percentage' or 'fixed'
        value: decimal("value", { precision: 12, scale: 2 }).notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        autoApply: boolean("auto_apply").default(false).notNull(),
        minOrderValueGhs: decimal("min_order_value_ghs", { precision: 12, scale: 2 }),
        /** When set, discount applies only to these product IDs. Null/empty = all products. */
        productIds: jsonb("product_ids").$type<string[] | null>(),
        startDate: timestamp("start_date", { withTimezone: true }),
        endDate: timestamp("end_date", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("discounts_business_id_idx").on(t.businessId),
        index("discounts_branch_id_idx").on(t.branchId)
    ]
);
