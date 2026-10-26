import { NextResponse } from "next/server";
import { z } from "zod";
import { getShopperFromCookies } from "@/server/shop/shopper-auth";
import { listShopperNotifications, markShopperNotificationsRead } from "@/server/shop/shopper-home";

export async function GET() {
    const shopper = await getShopperFromCookies();
    if (!shopper) return NextResponse.json({ error: "Sign in as a customer" }, { status: 401 });
    const notifications = await listShopperNotifications(shopper.id);
    return NextResponse.json({ notifications });
}

const bodySchema = z.object({
    all: z.boolean().optional(),
    ids: z.array(z.string().uuid()).max(50).optional(),
});

export async function POST(request: Request) {
    const shopper = await getShopperFromCookies();
    if (!shopper) return NextResponse.json({ error: "Sign in as a customer" }, { status: 401 });
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Could not update notifications" }, { status: 400 });
    }
    await markShopperNotificationsRead(
        shopper.id,
        parsed.data.all ? undefined : parsed.data.ids,
    );
    return NextResponse.json({ ok: true });
}
