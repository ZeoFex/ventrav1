import {
    pgTable,
    uuid,
    varchar,
    timestamp,
    boolean,
    index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const passwordResets = pgTable(
    "password_resets",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        tokenHash: varchar("token_hash", { length: 255 }).notNull(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        isUsed: boolean("is_used").default(false).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("password_resets_user_id_idx").on(t.userId),
        index("password_resets_token_hash_idx").on(t.tokenHash),
    ]
);
