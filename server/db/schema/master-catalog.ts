import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

/** Centralized categories per shop type (auto-discovered + admin-managed). */
export const masterCatalogCategories = pgTable(
    "master_catalog_categories",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        shopType: varchar("shop_type", { length: 100 }).notNull(),
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
        uniqueIndex("master_catalog_categories_shop_type_slug_uidx").on(
            t.shopType,
            t.slug
        ),
        index("master_catalog_categories_shop_type_idx").on(t.shopType),
        index("master_catalog_categories_name_idx").on(t.name),
    ]
);

/**
 * Master Products Catalog — aggregated from tenant inventories.
 * Separate from `products`; does not affect POS stock or pricing.
 */
export const masterProducts = pgTable(
    "master_products",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar("name", { length: 255 }).notNull(),
        normalizedName: varchar("normalized_name", { length: 255 }).notNull(),
        shopType: varchar("shop_type", { length: 100 }).notNull(),
        categoryId: uuid("category_id").references(() => masterCatalogCategories.id, {
            onDelete: "set null",
        }),
        /** Denormalized for fast filters; "Uncategorized" when no tenant category. */
        categoryName: varchar("category_name", { length: 255 })
            .default("Uncategorized")
            .notNull(),
        sourceProductId: uuid("source_product_id"),
        sourceBusinessId: uuid("source_business_id"),
        description: text("description"),
        imageSrc: text("image_src"),
        unit: varchar("unit", { length: 20 }),
        sku: varchar("sku", { length: 100 }),
        barcode: varchar("barcode", { length: 100 }),
        /** Denormalized shop name from `businesses.name` at sync time. */
        sourceBusinessName: varchar("source_business_name", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        syncedAt: timestamp("synced_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        uniqueIndex("master_products_dedup_uidx").on(
            t.normalizedName,
            t.shopType,
            t.categoryName
        ),
        index("master_products_name_idx").on(t.name),
        index("master_products_normalized_name_idx").on(t.normalizedName),
        index("master_products_shop_type_idx").on(t.shopType),
        index("master_products_category_id_idx").on(t.categoryId),
        index("master_products_category_name_idx").on(t.categoryName),
        index("master_products_source_product_id_idx").on(t.sourceProductId),
        index("master_products_source_business_id_idx").on(t.sourceBusinessId),
        index("master_products_barcode_idx").on(t.barcode),
        index("master_products_source_business_name_idx").on(t.sourceBusinessName),
    ]
);

/** History of catalog synchronization from tenant products. */
export const masterCatalogSyncLogs = pgTable(
    "master_catalog_sync_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        action: varchar("action", { length: 50 }).notNull(),
        masterProductId: uuid("master_product_id"),
        sourceProductId: uuid("source_product_id"),
        sourceBusinessId: uuid("source_business_id"),
        shopType: varchar("shop_type", { length: 100 }),
        productName: varchar("product_name", { length: 255 }),
        status: varchar("status", { length: 20 }).notNull(),
        message: text("message"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("master_catalog_sync_logs_created_at_idx").on(t.createdAt),
        index("master_catalog_sync_logs_shop_type_idx").on(t.shopType),
        index("master_catalog_sync_logs_status_idx").on(t.status),
    ]
);
