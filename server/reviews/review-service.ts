import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { reviews, type ReviewPage } from "../db/schema/reviews";

// New reviews are auto-approved (no moderation). To publish older pending rows:
//   UPDATE reviews SET status = 'approved' WHERE status = 'pending';

export async function listApprovedReviews(options?: {
    page?: ReviewPage | null;
    limit?: number;
}) {
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
    const page = options?.page;

    const query = db
        .select({
            id: reviews.id,
            name: reviews.name,
            role: reviews.role,
            rating: reviews.rating,
            content: reviews.content,
            page: reviews.page,
            createdAt: reviews.createdAt,
        })
        .from(reviews)
        .where(eq(reviews.status, "approved"));

    if (page) {
        return query
            .orderBy(
                sql`CASE
                    WHEN ${reviews.page} = ${page} THEN 0
                    WHEN ${reviews.page} = 'general' OR ${reviews.page} IS NULL THEN 1
                    ELSE 2
                END`,
                desc(reviews.createdAt),
            )
            .limit(limit);
    }

    return query.orderBy(desc(reviews.createdAt)).limit(limit);
}

export async function createReview(input: {
    name: string;
    role?: string | null;
    rating: number;
    content: string;
    page?: ReviewPage | null;
}) {
    const [row] = await db
        .insert(reviews)
        .values({
            name: input.name.trim().slice(0, 100),
            role: input.role?.trim().slice(0, 150) || null,
            rating: input.rating,
            content: input.content.trim().slice(0, 2000),
            page: input.page ?? null,
            status: "approved",
        })
        .returning({
            id: reviews.id,
            name: reviews.name,
            role: reviews.role,
            rating: reviews.rating,
            content: reviews.content,
            page: reviews.page,
            status: reviews.status,
            createdAt: reviews.createdAt,
        });
    return row ?? null;
}

export async function updateReview(
    id: string,
    input: {
        name: string;
        role?: string | null;
        rating: number;
        content: string;
    },
) {
    const [row] = await db
        .update(reviews)
        .set({
            name: input.name.trim().slice(0, 100),
            role: input.role?.trim().slice(0, 150) || null,
            rating: input.rating,
            content: input.content.trim().slice(0, 2000),
        })
        .where(and(eq(reviews.id, id), eq(reviews.status, "approved")))
        .returning({
            id: reviews.id,
            name: reviews.name,
            role: reviews.role,
            rating: reviews.rating,
            content: reviews.content,
            page: reviews.page,
            status: reviews.status,
            createdAt: reviews.createdAt,
        });
    return row ?? null;
}
