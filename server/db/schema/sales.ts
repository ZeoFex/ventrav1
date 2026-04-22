import {
    pgTable,
    uuid,
    varchar,
    decimal,
    integer,
    timestamp,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { products } from "./products";
import { customers } from "./customers";
import { branches } from "./branches";
import { users } from "./users";
import { productVariations } from "./products";

export const saleStatusEnum = pgEnum("sale_status", [
    "completed",
    "partially_refunded",
    "refunded",
    "voided",
]);

/** Sales that still contribute to net revenue (header totals already adjusted after returns). */
export const REVENUE_SALE_STATUSES = ["completed", "partially_refunded"] as const;

/** Completed POS transactions */
export const sales = pgTable(
    "sales",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .references(() => branches.id, { onDelete: "set null" }),
        invoiceId: varchar("invoice_id", { length: 50 }).notNull(),
        subtotalGhs: decimal("subtotal_ghs", { precision: 12, scale: 2 }).notNull(),
        taxGhs: decimal("tax_ghs", { precision: 12, scale: 2 }).notNull(),
        discountGhs: decimal("discount_ghs", { precision: 12, scale: 2 }).default("0").notNull(),
        totalGhs: decimal("total_ghs", { precision: 12, scale: 2 }).notNull(),
        paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
        itemCount: integer("item_count").notNull(),
        customerId: uuid("customer_id")
            .references(() => customers.id, { onDelete: "set null" }),
        userId: uuid("user_id")
            .references(() => users.id, { onDelete: "set null" }),
        status: saleStatusEnum("status").default("completed").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("sales_business_id_idx").on(t.businessId),
        index("sales_branch_id_idx").on(t.branchId),
        index("sales_biz_branch_idx").on(t.businessId, t.branchId),
        index("sales_created_at_idx").on(t.createdAt),
        index("sales_invoice_id_idx").on(t.invoiceId),
        index("sales_customer_id_idx").on(t.customerId),
        index("sales_user_id_idx").on(t.userId),
    ]
);

/** Individual line items within a sale */
export const saleItems = pgTable(
    "sale_items",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        saleId: uuid("sale_id")
            .notNull()
            .references(() => sales.id, { onDelete: "cascade" }),
        productId: uuid("product_id")
            .references(() => products.id, { onDelete: "set null" }),
        variationId: uuid("variation_id").references(() => productVariations.id, { onDelete: "set null" }),
        productName: varchar("product_name", { length: 255 }).notNull(),
        quantity: integer("quantity").notNull(),
        quantityReturned: integer("quantity_returned").default(0).notNull(),
        unitPriceGhs: decimal("unit_price_ghs", { precision: 12, scale: 2 }).notNull(),
        lineTotalGhs: decimal("line_total_ghs", { precision: 12, scale: 2 }).notNull(),
    },
    (t) => [
        index("sale_items_sale_id_idx").on(t.saleId),
        index("sale_items_product_id_idx").on(t.productId),
    ]
);
