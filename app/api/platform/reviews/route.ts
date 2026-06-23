import { type NextRequest, NextResponse } from "next/server";
import { gatePlatform, parsePagination } from "@/server/catalog/platform-route-utils";
import { REVIEW_PAGES } from "@/server/db/schema/reviews";
import { listReviewsForAdmin } from "@/server/reviews/review-service";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "approved", "rejected"] as const;

/** GET — list landing page reviews for platform admin. */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);

    const pageParam = searchParams.get("page");
    const page =
        pageParam && (REVIEW_PAGES as readonly string[]).includes(pageParam)
            ? (pageParam as (typeof REVIEW_PAGES)[number])
            : null;

    const statusParam = searchParams.get("status");
    const status =
        statusParam && (STATUSES as readonly string[]).includes(statusParam)
            ? (statusParam as (typeof STATUSES)[number])
            : null;

    const result = await listReviewsForAdmin({ limit, offset, page, status });
    return NextResponse.json(result);
}
