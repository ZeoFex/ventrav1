import {
    pgTable,
    uuid,
    varchar,
    decimal,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { customers } from "./customers";
import { sales } from "./sales";

/** Ledger row: sale_charge increases AR; payment_received decreases AR (amounts are positive magnitudes). */
export const customerAccountEntries = pgTable(
    "customer_account_entries",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        customerId: uuid("customer_id")
            .notNull()
            .references(() => customers.id, { onDelete: "cascade" }),
        saleId: uuid("sale_id").references(() => sales.id, { onDelete: "set null" }),
        kind: varchar("kind", { length: 24 }).notNull(),
        amountGhs: decimal("amount_ghs", { precision: 12, scale: 2 }).notNull(),
        note: varchar("note", { length: 500 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("customer_account_entries_customer_id_idx").on(t.customerId),
        index("customer_account_entries_business_id_idx").on(t.businessId),
    ]
);
