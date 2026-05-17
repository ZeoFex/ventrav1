import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    decimal,
    timestamp,
    date,
    index,
    uniqueIndex,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { products } from "./products";

export const supplierTypeEnum = pgEnum("supplier_type", ["individual", "business"]);
export const supplyOrderPaymentStatusEnum = pgEnum("supply_order_payment_status", [
    "unpaid",
    "partial",
    "paid",
]);

export const suppliers = pgTable(
    "suppliers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        type: supplierTypeEnum("type").default("business").notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        truckNumber: varchar("truck_number", { length: 50 }),
        email: varchar("email", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("suppliers_business_id_idx").on(t.businessId),
        index("suppliers_branch_id_idx").on(t.branchId),
    ],
);

export const supplierPhones = pgTable(
    "supplier_phones",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        supplierId: uuid("supplier_id")
            .notNull()
            .references(() => suppliers.id, { onDelete: "cascade" }),
        phone: varchar("phone", { length: 50 }).notNull(),
        sortOrder: integer("sort_order").default(0).notNull(),
    },
    (t) => [index("supplier_phones_supplier_id_idx").on(t.supplierId)],
);

export const supplyOrders = pgTable(
    "supply_orders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        supplierId: uuid("supplier_id")
            .notNull()
            .references(() => suppliers.id, { onDelete: "cascade" }),
        reference: varchar("reference", { length: 80 }).notNull(),
        orderedAt: timestamp("ordered_at", { withTimezone: true }).defaultNow().notNull(),
        paymentStatus: supplyOrderPaymentStatusEnum("payment_status").default("unpaid").notNull(),
        amountPaidGhs: decimal("amount_paid_ghs", { precision: 12, scale: 2 }).default("0").notNull(),
        totalCostGhs: decimal("total_cost_ghs", { precision: 12, scale: 2 }).notNull(),
        totalLineItems: integer("total_line_items").default(0).notNull(),
        /** Sum of line quantities (units) for supply history. */
        totalUnitsSupplied: integer("total_units_supplied").default(0).notNull(),
        paymentMethod: varchar("payment_method", { length: 30 }),
        notes: text("notes"),
        idempotencyKey: varchar("idempotency_key", { length: 100 }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("supply_orders_business_id_idx").on(t.businessId),
        index("supply_orders_supplier_id_idx").on(t.supplierId),
        index("supply_orders_ordered_at_idx").on(t.orderedAt),
        uniqueIndex("supply_orders_business_idempotency_unique").on(t.businessId, t.idempotencyKey),
    ],
);

export const supplyOrderLines = pgTable(
    "supply_order_lines",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        supplyOrderId: uuid("supply_order_id")
            .notNull()
            .references(() => supplyOrders.id, { onDelete: "cascade" }),
        productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
        productName: varchar("product_name", { length: 255 }).notNull(),
        categoryName: varchar("category_name", { length: 100 }),
        cartons: integer("cartons").default(0).notNull(),
        itemsPerCarton: integer("items_per_carton").default(1).notNull(),
        quantityTotal: integer("quantity_total").notNull(),
        unitCostGhs: decimal("unit_cost_ghs", { precision: 12, scale: 4 }).notNull(),
        lineTotalGhs: decimal("line_total_ghs", { precision: 12, scale: 2 }).notNull(),
        batchNo: varchar("batch_no", { length: 80 }),
        expiryDate: date("expiry_date"),
        notes: text("notes"),
    },
    (t) => [
        index("supply_order_lines_order_id_idx").on(t.supplyOrderId),
        index("supply_order_lines_product_id_idx").on(t.productId),
    ],
);
