import { pgTable, uuid, varchar, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

/** One row per referee business that completed a first qualifying paid subscription (credits referrer once). */
export const referralQualifications = pgTable(
    "referral_qualifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        referrerBusinessId: uuid("referrer_business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        refereeBusinessId: uuid("referee_business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        firstChargeReference: varchar("first_charge_reference", { length: 255 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        uniqueIndex("referral_qualifications_referee_unique").on(t.refereeBusinessId),
        index("referral_qualifications_referrer_idx").on(t.referrerBusinessId),
    ],
);
