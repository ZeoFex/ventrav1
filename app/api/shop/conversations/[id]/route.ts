import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { shopConversations } from "@/server/db/schema/shop-conversations";
import { getShopperFromCookies, loadShopper } from "@/server/shop/shopper-auth";
import { listMessages, sendShopMessage } from "@/server/shop/shop-messages";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
    const shopper = await getShopperFromCookies();
    if (!shopper) return NextResponse.json({ error: "Sign in to see your messages" }, { status: 401 });
    const { id } = await context.params;
    const [conversation] = await db
        .select()
        .from(shopConversations)
        .where(and(eq(shopConversations.id, id), eq(shopConversations.shopperId, shopper.id)))
        .limit(1);
    if (!conversation) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const messages = await listMessages(id);
    return NextResponse.json({ conversation, messages });
}

const bodySchema = z.object({
    body: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request, context: RouteContext) {
    const session = await getShopperFromCookies();
    if (!session) return NextResponse.json({ error: "Sign in to send a message" }, { status: 401 });
    const shopper = await loadShopper(session.id);
    if (!shopper) return NextResponse.json({ error: "Sign in again" }, { status: 401 });
    const { id } = await context.params;
    const [conversation] = await db
        .select()
        .from(shopConversations)
        .where(and(eq(shopConversations.id, id), eq(shopConversations.shopperId, shopper.id)))
        .limit(1);
    if (!conversation) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json({ error: "Write a message first" }, { status: 400 });
    }

    const message = await sendShopMessage({
        conversationId: id,
        businessId: conversation.businessId,
        sender: "customer",
        senderName: conversation.customerName,
        body: parsed.data.body,
    });
    return NextResponse.json({ message });
}
