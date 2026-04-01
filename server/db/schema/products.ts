import {
    pgTable,
    uuid,
    varchar,
    text,
    decimal,
    integer,
    boolean,
    timestamp,
    index,
    primaryKey,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";

export const productStatusEnum = pgEnum("product_status", [
    "active",
    "archived",
    "out_of_stock",
]);

/** Categories for grouping products (e.g., Beverages, Snacks) */
export const categories = pgTable(
    "categories",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
        description: text("description"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("categories_business_id_idx").on(t.businessId),
        index("categories_branch_id_idx").on(t.branchId)
    ]
);

/** Tags for granular filtering (e.g., "Trending", "Special Offer") */
export const tags = pgTable(
    "tags",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),
        name: varchar("name", { length: 100 }).notNull(),
        color: varchar("color", { length: 20 }), // e.g. emerald, rose, sky
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("tags_business_id_idx").on(t.businessId),
        index("tags_branch_id_idx").on(t.branchId)
    ]
);

/** The core Product catalog */
export const products = pgTable(
    "products",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        categoryId: uuid("category_id").references(() => categories.id, {
            onDelete: "set null",
        }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
        sku: varchar("sku", { length: 100 }).notNull(),
        barcode: varchar("barcode", { length: 100 }),
        description: text("description"),
        imageSrc: text("image_src"),
        priceGhs: decimal("price_ghs", { precision: 12, scale: 2 }).notNull(),
        costPriceGhs: decimal("cost_price_ghs", { precision: 12, scale: 2 }),

        // Inventory
        stock: integer("stock").default(0).notNull(),
        reorderAt: integer("reorder_at").default(5),
        trackInventory: boolean("track_inventory").default(true).notNull(),

        status: productStatusEnum("status").default("active").notNull(),

        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("products_business_id_idx").on(t.businessId),
        index("products_sku_idx").on(t.sku),
        index("products_barcode_idx").on(t.barcode),
        index("products_category_id_idx").on(t.categoryId),
        index("products_branch_id_idx").on(t.branchId),
    ]
);

/** Linking Table: Products <-> Tags */
export const productTags = pgTable(
    "product_tags",
    {
        productId: uuid("product_id")
            .notNull()
            .references(() => products.id, { onDelete: "cascade" }),
        tagId: uuid("tag_id")
            .notNull()
            .references(() => tags.id, { onDelete: "cascade" }),
    },
    (t) => [primaryKey({ columns: [t.productId, t.tagId] })]
);
