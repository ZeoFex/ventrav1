import { NextResponse } from "next/server";
import { getShopperFromCookies, loadShopper } from "@/server/shop/shopper-auth";

export async function GET() {
    const session = await getShopperFromCookies();
    if (!session) return NextResponse.json({ shopper: null });
    const shopper = await loadShopper(session.id);
    return NextResponse.json({ shopper });
}
