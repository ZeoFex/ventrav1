import { type NextRequest, NextResponse } from "next/server";
import { gatePlatform } from "@/server/catalog/platform-route-utils";
import { deleteReview } from "@/server/reviews/review-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** DELETE — remove a landing page review (platform admin). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    if (!UUID_RE.test(id)) {
        return NextResponse.json({ error: "Invalid review id" }, { status: 400 });
    }

    const ok = await deleteReview(id);
    if (!ok) {
        return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
}
