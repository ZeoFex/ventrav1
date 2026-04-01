import {
    pgTable,
    uuid,
    varchar,
    boolean,
    integer,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * Email verification OTPs.
 * A new row is created for each OTP request.
 * Code is stored as SHA-256 hash — raw code only sent via email.
 */
export const emailVerifications = pgTable(
    "email_verifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        codeHash: varchar("code_hash", { length: 128 }).notNull(),
        attempts: integer("attempts").default(0).notNull(),
        isUsed: boolean("is_used").default(false).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    },
    (t) => [
        index("email_verifications_user_id_idx").on(t.userId),
        index("email_verifications_expires_at_idx").on(t.expiresAt),
    ]
);
