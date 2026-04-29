import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { addModifierOption } from "@/server/restaurant/menu-service";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;

        const body = (await req.json()) as {
            groupId?: string;
            productId?: string;
            priceAdjustmentGhs?: number | null;
        };
        const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
        const productId = typeof body.productId === "string" ? body.productId.trim() : "";
        if (!groupId || !productId) {
            return NextResponse.json({ error: "groupId and productId required" }, { status: 400 });
        }

        const row = await addModifierOption({
            businessId: auth.payload.bid,
            groupId,
            productId,
            priceAdjustmentGhs: body.priceAdjustmentGhs,
        });
        return NextResponse.json(row);
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "GROUP_NOT_FOUND") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (msg === "RESTAURANT_ONLY") {
            return NextResponse.json({ error: "Restaurant businesses only" }, { status: 403 });
        }
        console.error("modifier-options POST:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
