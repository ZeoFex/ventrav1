import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    timestamp,
    pgEnum,
    index,
} from "drizzle-orm/pg-core";

export const reviewStatusEnum = pgEnum("review_status", [
    "pending",
    "approved",
    "rejected",
]);

export const REVIEW_PAGES = [
    "home",
    "about",
    "features",
    "pricing",
    "contact",
    "general",
] as const;

export type ReviewPage = (typeof REVIEW_PAGES)[number];

export const reviews = pgTable(
    "reviews",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: varchar("name", { length: 100 }).notNull(),
        role: varchar("role", { length: 150 }),
        rating: integer("rating").notNull(),
        content: text("content").notNull(),
        page: varchar("page", { length: 50 }),
        status: reviewStatusEnum("status").default("pending").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("reviews_status_idx").on(t.status),
        index("reviews_page_idx").on(t.page),
        index("reviews_created_at_idx").on(t.createdAt),
    ],
);
