import {
    pgTable,
    uuid,
    varchar,
    decimal,
    integer,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { customers } from "./customers";
import { users } from "./users";
import { products, productVariations } from "./products";
import { sales } from "./sales";

/** open: balance may remain; ready_for_pickup: paid in full, await sale; completed / cancelled: terminal */
export const CUSTOMER_ORDER_STATUSES = [
    "open",
    "ready_for_pickup",
    "completed",
    "cancelled",
] as const;
export type CustomerOrderStatus = (typeof CUSTOMER_ORDER_STATUSES)[number];

export const customerOrders = pgTable(
    "customer_orders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),
        customerId: uuid("customer_id")
            .notNull()
            .references(() => customers.id, { onDelete: "cascade" }),
        userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
        invoiceId: varchar("invoice_id", { length: 50 }).notNull(),
        status: varchar("status", { length: 24 }).notNull(),
        subtotalGhs: decimal("subtotal_ghs", { precision: 12, scale: 2 }).notNull(),
        taxGhs: decimal("tax_ghs", { precision: 12, scale: 2 }).notNull(),
        discountGhs: decimal("discount_ghs", { precision: 12, scale: 2 })
            .default("0")
            .notNull(),
        totalGhs: decimal("total_ghs", { precision: 12, scale: 2 }).notNull(),
        amountPaidGhs: decimal("amount_paid_ghs", { precision: 12, scale: 2 })
            .default("0")
            .notNull(),
        balanceDueGhs: decimal("balance_due_ghs", { precision: 12, scale: 2 })
            .default("0")
            .notNull(),
        completedSaleId: uuid("completed_sale_id").references(() => sales.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
   (t) => [
        index("customer_orders_business_id_idx").on(t.businessId),
        index("customer_orders_branch_id_idx").on(t.branchId),
        index("customer_orders_customer_id_idx").on(t.customerId),
        index("customer_orders_status_idx").on(t.status),
        index("customer_orders_invoice_id_idx").on(t.invoiceId),
    ],
);

export const customerOrderLines = pgTable(
    "customer_order_lines",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        customerOrderId: uuid("customer_order_id")
            .notNull()
            .references(() => customerOrders.id, { onDelete: "cascade" }),
        productId: uuid("product_id").references(() => products.id, {
            onDelete: "set null",
        }),
        variationId: uuid("variation_id").references(() => productVariations.id, {
            onDelete: "set null",
        }),
        productName: varchar("product_name", { length: 255 }).notNull(),
        quantity: integer("quantity").notNull(),
        unitPriceGhs: decimal("unit_price_ghs", { precision: 12, scale: 2 }).notNull(),
        lineTotalGhs: decimal("line_total_ghs", { precision: 12, scale: 2 }).notNull(),
    },
    (t) => [index("customer_order_lines_order_id_idx").on(t.customerOrderId)],
);

export const customerOrderPaymentLines = pgTable(
    "customer_order_payment_lines",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        customerOrderId: uuid("customer_order_id")
            .notNull()
            .references(() => customerOrders.id, { onDelete: "cascade" }),
        paymentMethod: varchar("payment_method", { length: 30 }).notNull(),
        amountGhs: decimal("amount_ghs", { precision: 12, scale: 2 }).notNull(),
        sortOrder: integer("sort_order").default(0).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("customer_order_payment_lines_order_id_idx").on(t.customerOrderId),
    ],
);
