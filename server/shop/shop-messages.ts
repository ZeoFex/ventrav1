import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema/notifications";
import { shopConversations, shopMessages } from "@/server/db/schema/shop-conversations";
import { shopperNotifications } from "@/server/db/schema/shopper-notifications";

export async function listBusinessConversations(businessId: string) {
    const conversations = await db
        .select()
        .from(shopConversations)
        .where(eq(shopConversations.businessId, businessId))
        .orderBy(desc(shopConversations.createdAt));
    return attachPreviews(conversations);
}

export async function listShopperConversations(shopperId: string) {
    const conversations = await db
        .select()
        .from(shopConversations)
        .where(eq(shopConversations.shopperId, shopperId))
        .orderBy(desc(shopConversations.createdAt));
    return attachPreviews(conversations);
}

async function attachPreviews<T extends { id: string }>(conversations: T[]) {
    if (conversations.length === 0) return [];
    const previews = await Promise.all(
        conversations.map(async (conversation) => {
            const [latest] = await db
                .select({
                    body: shopMessages.body,
                    createdAt: shopMessages.createdAt,
                    sender: shopMessages.sender,
                })
                .from(shopMessages)
                .where(eq(shopMessages.conversationId, conversation.id))
                .orderBy(desc(shopMessages.createdAt))
                .limit(1);
            return {
                ...conversation,
                lastMessage: latest?.body ?? "",
                lastMessageAt: latest?.createdAt ?? null,
                lastSender: latest?.sender ?? null,
            };
        }),
    );
    return previews.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
    });
}

export async function listMessages(conversationId: string) {
    return db
        .select()
        .from(shopMessages)
        .where(eq(shopMessages.conversationId, conversationId))
        .orderBy(asc(shopMessages.createdAt));
}

export async function sendShopMessage(input: {
    conversationId: string;
    businessId: string;
    sender: "shop" | "customer";
    senderName: string;
    body: string;
}) {
    const body = input.body.trim();
    if (!body) throw new Error("Write a message first");
    if (body.length > 2000) throw new Error("Message is too long");

    const [conversation] = await db
        .select()
        .from(shopConversations)
        .where(
            and(
                eq(shopConversations.id, input.conversationId),
                eq(shopConversations.businessId, input.businessId),
            ),
        )
        .limit(1);
    if (!conversation) throw new Error("Conversation not found");

    const [message] = await db
        .insert(shopMessages)
        .values({
            conversationId: conversation.id,
            sender: input.sender,
            senderName: input.senderName,
            body,
        })
        .returning();

    if (input.sender === "customer") {
        await db.insert(notifications).values({
            businessId: conversation.businessId,
            branchId: conversation.branchId,
            title: "New shop message",
            body: `${conversation.customerName} (${conversation.customerPhone}): ${body.slice(0, 180)}`,
            icon: "info",
        });
    }

    if (input.sender === "shop") {
        await db.insert(shopperNotifications).values({
            shopperId: conversation.shopperId,
            title: `Message from ${conversation.shopName}`,
            body: body.slice(0, 180),
            href: "/customer?tab=messages",
        });
    }

    return message;
}
