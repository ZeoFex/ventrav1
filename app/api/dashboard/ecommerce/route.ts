import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { listBusinessConversations } from "@/server/shop/shop-messages";

export async function GET() {
    const auth = await requireUserAuthFromContext();
    if (auth instanceof NextResponse) return auth;
    const conversations = await listBusinessConversations(auth.payload.bid);
    return NextResponse.json({ conversations });
}
