import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const pendingSubscriptions = pgTable("pending_subscriptions", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 320 }).notNull(),
    plan: varchar("plan", { length: 50 }).notNull(),
    cycle: varchar("cycle", { length: 20 }).notNull(),
    reference: varchar("reference", { length: 100 }).unique().notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    amount: varchar("amount", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
