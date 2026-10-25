import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

/** People who buy from the public shop. Separate from shop-owner accounts. */
export const shoppers = pgTable(
    "shoppers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: varchar("email", { length: 320 }).notNull().unique(),
        emailNormalized: varchar("email_normalized", { length: 320 }).notNull().unique(),
        passwordHash: text("password_hash").notNull(),
        phone: varchar("phone", { length: 30 }).notNull(),
        region: varchar("region", { length: 100 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("shoppers_email_normalized_idx").on(t.emailNormalized)],
);
