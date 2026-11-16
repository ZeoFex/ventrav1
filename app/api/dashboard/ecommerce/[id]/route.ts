import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { shopConversations } from "@/server/db/schema/shop-conversations";
import { listMessages, sendShopMessage } from "@/server/shop/shop-messages";

type RouteContext = { params: Promise<{ id: string }> };

async function ownedConversation(businessId: string, id: string) {
    const [row] = await db
        .select()
        .from(shopConversations)
        .where(and(eq(shopConversations.id, id), eq(shopConversations.businessId, businessId)))
        .limit(1);
    return row ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
    const auth = await requireUserAuthFromContext();
    if (auth instanceof NextResponse) return auth;
    const { id } = await context.params;
    const conversation = await ownedConversation(auth.payload.bid, id);
    if (!conversation) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const messages = await listMessages(id);
    return NextResponse.json({ conversation, messages });
}

const bodySchema = z.object({
    body: z.string().trim().min(1, "Write a message first").max(2000),
});

export async function POST(request: Request, context: RouteContext) {
    const auth = await requireUserAuthFromContext();
    if (auth instanceof NextResponse) return auth;
    const { id } = await context.params;
    const conversation = await ownedConversation(auth.payload.bid, id);
    if (!conversation) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Write a message first" },
            { status: 400 },
        );
    }

    const message = await sendShopMessage({
        conversationId: id,
        businessId: auth.payload.bid,
        sender: "shop",
        senderName: auth.payload.name || "Shop",
        body: parsed.data.body,
    });
    return NextResponse.json({ message });
}
