import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { reorderMenuItems } from "@/server/restaurant/menu-service";

export const runtime = "nodejs";

export async function POST(
    req: Request,
    ctx: { params: Promise<{ sectionId: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { sectionId } = await ctx.params;
        const body = (await req.json()) as { orderedItemIds?: unknown };
        if (!Array.isArray(body.orderedItemIds)) {
            return NextResponse.json({ error: "orderedItemIds required" }, { status: 400 });
        }

        await reorderMenuItems({
            businessId: auth.payload.bid,
            sectionId,
            orderedItemIds: body.orderedItemIds.map(String),
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "SECTION_NOT_FOUND") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (msg === "RESTAURANT_ONLY") {
            return NextResponse.json({ error: "Restaurant businesses only" }, { status: 403 });
        }
        console.error("items reorder:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
