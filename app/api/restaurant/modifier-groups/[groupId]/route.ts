import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import {
    deleteModifierGroup,
    updateModifierGroup,
} from "@/server/restaurant/menu-service";

export const runtime = "nodejs";

export async function PATCH(
    req: Request,
    ctx: { params: Promise<{ groupId: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { groupId } = await ctx.params;
        const body = (await req.json()) as {
            name?: string;
            minSelect?: number;
            maxSelect?: number;
        };

        await updateModifierGroup({
            businessId: auth.payload.bid,
            groupId,
            ...(typeof body.name === "string" ? { name: body.name } : {}),
            ...(typeof body.minSelect === "number" ? { minSelect: body.minSelect } : {}),
            ...(typeof body.maxSelect === "number" ? { maxSelect: body.maxSelect } : {}),
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "GROUP_NOT_FOUND") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (msg === "RESTAURANT_ONLY") {
            return NextResponse.json({ error: "Restaurant businesses only" }, { status: 403 });
        }
        console.error("modifier-groups PATCH:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    ctx: { params: Promise<{ groupId: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { groupId } = await ctx.params;

        await deleteModifierGroup({
            businessId: auth.payload.bid,
            groupId,
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "GROUP_NOT_FOUND") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (msg === "RESTAURANT_ONLY") {
            return NextResponse.json({ error: "Restaurant businesses only" }, { status: 403 });
        }
        console.error("modifier-groups DELETE:", e);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
