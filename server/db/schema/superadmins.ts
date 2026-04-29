import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    pgEnum,
    index,
} from "drizzle-orm/pg-core";

export const superadminStatusEnum = pgEnum("superadmin_status", [
    "active",
    "suspended",
]);

export const superadmins = pgTable(
    "superadmins",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: varchar("email", { length: 320 }).notNull().unique(),
        emailNormalized: varchar("email_normalized", { length: 320 })
            .notNull()
            .unique(),
        passwordHash: text("password_hash").notNull(),
        firstName: varchar("first_name", { length: 100 }).notNull(),
        lastName: varchar("last_name", { length: 100 }),
        status: superadminStatusEnum("status").default("active").notNull(),
        lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [index("superadmins_email_normalized_idx").on(t.emailNormalized)]
);
