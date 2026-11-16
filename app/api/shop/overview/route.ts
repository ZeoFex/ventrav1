import { NextResponse } from "next/server";
import { getShopperFromCookies, loadShopper } from "@/server/shop/shopper-auth";
import { shopperOverview } from "@/server/shop/shopper-home";

export async function GET() {
    const session = await getShopperFromCookies();
    if (!session) return NextResponse.json({ error: "Sign in as a customer" }, { status: 401 });
    const shopper = await loadShopper(session.id);
    if (!shopper) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
    const overview = await shopperOverview(shopper.id);
    return NextResponse.json({ shopper, ...overview });
}
