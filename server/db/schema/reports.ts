import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    jsonb,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const reportStatusEnum = pgEnum("report_status", [
    "sent",
    "failed",
    "pending",
]);

/**
 * Historical record of weekly performance reports.
 * Used for business owners to audit past metrics.
 */
export const reports = pgTable(
    "reports",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        reportDate: timestamp("report_date", { withTimezone: true })
            .defaultNow()
            .notNull(),
        type: varchar("type", { length: 50 }).default("weekly_summary").notNull(),
        stats: jsonb("stats").notNull(), // Stores { salesTotal, topProducts: [], lowStockCount, etc. }
        status: reportStatusEnum("status").default("pending").notNull(),
        errorMessage: varchar("error_message", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("reports_business_id_idx").on(t.businessId),
        index("reports_report_date_idx").on(t.reportDate),
    ]
);
