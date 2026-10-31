import { NextResponse } from "next/server";
import { getShopperFromCookies } from "@/server/shop/shopper-auth";
import { listShopperConversations } from "@/server/shop/shop-messages";

export async function GET() {
    const shopper = await getShopperFromCookies();
    if (!shopper) return NextResponse.json({ error: "Sign in to see your messages" }, { status: 401 });
    const conversations = await listShopperConversations(shopper.id);
    return NextResponse.json({ conversations });
}
