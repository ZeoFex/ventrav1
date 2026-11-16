import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { shoppers } from "./shoppers";

/** Alerts for a shopping customer: order updates and shop replies. */
export const shopperNotifications = pgTable(
    "shopper_notifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        shopperId: uuid("shopper_id")
            .notNull()
            .references(() => shoppers.id, { onDelete: "cascade" }),
        title: varchar("title", { length: 255 }).notNull(),
        body: text("body").notNull(),
        href: varchar("href", { length: 255 }),
        isRead: boolean("is_read").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("shopper_notifications_shopper_id_idx").on(t.shopperId)],
);
