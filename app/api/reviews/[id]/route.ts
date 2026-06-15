import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyReviewEditToken } from "@/server/reviews/edit-token";
import { updateReviewSchema } from "@/server/reviews/review-schemas";
import { updateReview } from "@/server/reviews/review-service";

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

const idSchema = z.string().uuid();

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        if (!idSchema.safeParse(id).success) {
            return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
        }

        const json = await req.json();
        const parsed = updateReviewSchema.safeParse(json);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid body", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const allowed = await verifyReviewEditToken(parsed.data.editToken, id);
        if (!allowed) {
            return NextResponse.json(
                { error: "You can only edit your own review from this browser." },
                { status: 403 },
            );
        }

        const row = await updateReview(id, {
            name: parsed.data.name,
            role: parsed.data.role ?? null,
            rating: parsed.data.rating,
            content: parsed.data.content,
        });

        if (!row) {
            return NextResponse.json({ error: "Review not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: "Your review has been updated.",
            review: row,
        });
    } catch (e) {
        console.error("PATCH /api/reviews/[id]", e);
        if (isMissingReviewsTableError(e)) {
            return NextResponse.json({ error: REVIEWS_SETUP_MESSAGE }, { status: 503 });
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
