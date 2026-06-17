import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    pgEnum,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const userStatusEnum = pgEnum("user_status", [
    "pending_verification",
    "active",
    "suspended",
    "deactivated",
]);

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        email: varchar("email", { length: 320 }).unique().notNull(),
        emailNormalized: varchar("email_normalized", { length: 320 })
            .unique()
            .notNull(),
        passwordHash: text("password_hash").notNull(),
        firstName: varchar("first_name", { length: 100 }).notNull(),
        lastName: varchar("last_name", { length: 100 }),
        phone: varchar("phone", { length: 30 }),
        phoneNormalized: varchar("phone_normalized", { length: 20 }),
        emailVerified: boolean("email_verified").default(false).notNull(),
        status: userStatusEnum("status")
            .default("pending_verification")
            .notNull(),
        lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
        avatarUrl: text("avatar_url"),
        city: varchar("city", { length: 100 }),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("users_email_idx").on(t.email),
        index("users_email_normalized_idx").on(t.emailNormalized),
        index("users_business_id_idx").on(t.businessId),
        index("users_phone_normalized_idx").on(t.phoneNormalized),
    ]
);
