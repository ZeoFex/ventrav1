import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { customerOrderLines, customerOrders } from "@/server/db/schema/customer-orders";
import { shopConversations } from "@/server/db/schema/shop-conversations";
import { shopperNotifications } from "@/server/db/schema/shopper-notifications";

const ACTIVE = new Set(["open", "ready_for_pickup"]);

export async function shopperOverview(shopperId: string) {
    const orders = await db
        .select({
            id: shopConversations.id,
            invoiceId: shopConversations.invoiceId,
            shopName: shopConversations.shopName,
            totalGhs: shopConversations.totalGhs,
            status: customerOrders.status,
            orderId: customerOrders.id,
            createdAt: shopConversations.createdAt,
        })
        .from(shopConversations)
        .innerJoin(customerOrders, eq(customerOrders.id, shopConversations.customerOrderId))
        .where(eq(shopConversations.shopperId, shopperId))
        .orderBy(sql`${shopConversations.createdAt} desc`);

    const orderIds = orders.map((order) => order.orderId);
    const lines = orderIds.length
        ? await db
              .select({
                  orderId: customerOrderLines.customerOrderId,
                  quantity: customerOrderLines.quantity,
              })
              .from(customerOrderLines)
              .where(inArray(customerOrderLines.customerOrderId, orderIds))
        : [];
    const qtyByOrder = new Map<string, number>();
    for (const line of lines) {
        qtyByOrder.set(line.orderId, (qtyByOrder.get(line.orderId) ?? 0) + line.quantity);
    }

    const shaped = orders.map((order) => ({
        id: order.id,
        invoiceId: order.invoiceId,
        shopName: order.shopName,
        totalGhs: order.totalGhs,
        status: order.status,
        itemCount: qtyByOrder.get(order.orderId) ?? 0,
        createdAt: order.createdAt,
    }));

    const active = shaped.filter((order) => ACTIVE.has(order.status));
    const [unread] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(shopperNotifications)
        .where(and(eq(shopperNotifications.shopperId, shopperId), eq(shopperNotifications.isRead, false)));

    return {
        itemsBeingOrdered: active.reduce((sum, order) => sum + order.itemCount, 0),
        openOrders: active.length,
        unreadNotifications: unread?.count ?? 0,
        orders: shaped,
    };
}

export async function listShopperNotifications(shopperId: string) {
    return db
        .select()
        .from(shopperNotifications)
        .where(eq(shopperNotifications.shopperId, shopperId))
        .orderBy(sql`${shopperNotifications.createdAt} desc`)
        .limit(50);
}

export async function markShopperNotificationsRead(shopperId: string, ids?: string[]) {
    if (ids && ids.length === 0) return;
    await db
        .update(shopperNotifications)
        .set({ isRead: true })
        .where(
            ids
                ? and(eq(shopperNotifications.shopperId, shopperId), inArray(shopperNotifications.id, ids))
                : eq(shopperNotifications.shopperId, shopperId),
        );
}
