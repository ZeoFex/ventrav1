import { NextResponse } from "next/server";
import { z } from "zod";
import { REVIEW_PAGES } from "@/server/db/schema/reviews";
import { signReviewEditToken } from "@/server/reviews/edit-token";
import { submitReviewSchema } from "@/server/reviews/review-schemas";
import { createReview, listApprovedReviews } from "@/server/reviews/review-service";

const REVIEWS_SETUP_MESSAGE =
    "Reviews are not set up yet. Run npm run db:push or npm run db:migrate to create the reviews table.";

function isMissingReviewsTableError(e: unknown): boolean {
    if (!e || typeof e !== "object") return false;
    const err = e as { code?: string; message?: string; cause?: unknown };
    if (err.code === "42P01") return true;
    const message = String(err.message ?? "");
    if (message.includes('relation "reviews" does not exist')) return true;
    if (err.cause) return isMissingReviewsTableError(err.cause);
    return false;
}

const submitSchema = submitReviewSchema;

const listQuerySchema = z.object({
    page: z.enum(REVIEW_PAGES).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const parsed = listQuerySchema.safeParse({
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const rows = await listApprovedReviews({
            page: parsed.data.page ?? null,
            limit: parsed.data.limit,
        });

        return NextResponse.json(rows, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (e) {
        console.error("GET /api/reviews", e);
        if (isMissingReviewsTableError(e)) {
            return NextResponse.json({ error: REVIEWS_SETUP_MESSAGE }, { status: 503 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const json = await req.json();
        const parsed = submitSchema.safeParse(json);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid body", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const row = await createReview({
            name: parsed.data.name,
            role: parsed.data.role ?? null,
            rating: parsed.data.rating,
            content: parsed.data.content,
            page: parsed.data.page ?? null,
        });

        if (!row) {
            return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
        }

        const editToken = await signReviewEditToken(row.id);

        return NextResponse.json(
            {
                success: true,
                message: "Thank you! Your review has been published.",
                review: row,
                editToken,
            },
            { status: 201 },
        );
    } catch (e) {
        console.error("POST /api/reviews", e);
        if (isMissingReviewsTableError(e)) {
            return NextResponse.json({ error: REVIEWS_SETUP_MESSAGE }, { status: 503 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
