/**
 * In-app notifications for the VentraPOS platform admin portal.
 */
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import {
    platformNotifications,
    type PlatformNotification,
} from "../db/schema/platform-notifications";

export type PlatformNotificationType =
    | "shop_created"
    | "shop_onboarded"
    | "subscription_past_due"
    | "subscription_expiring"
    | "product_added"
    | "products_bulk_added";

export type EmitPlatformNotificationInput = {
    type: PlatformNotificationType;
    title: string;
    body: string;
    businessId?: string | null;
    productId?: string | null;
    metadata?: Record<string, unknown>;
    /** Skip insert if same type+business exists within this many hours. */
    dedupeHours?: number;
};

function toIso(d: Date | string): string {
    return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

export async function emitPlatformNotification(
    input: EmitPlatformNotificationInput
): Promise<PlatformNotification | null> {
    if (input.dedupeHours && input.businessId) {
        const since = new Date(Date.now() - input.dedupeHours * 60 * 60 * 1000);
        const [existing] = await db
            .select({ id: platformNotifications.id })
            .from(platformNotifications)
            .where(
                and(
                    eq(platformNotifications.type, input.type),
                    eq(platformNotifications.businessId, input.businessId),
                    gte(platformNotifications.createdAt, since)
                )
            )
            .limit(1);
        if (existing) return null;
    }

    const [row] = await db
        .insert(platformNotifications)
        .values({
            type: input.type,
            title: input.title,
            body: input.body,
            businessId: input.businessId ?? null,
            productId: input.productId ?? null,
            metadata: input.metadata ?? null,
        })
        .returning();

    return row ?? null;
}

/** Fire-and-forget — never blocks caller workflows. */
export function notifyPlatformAdmin(input: EmitPlatformNotificationInput): void {
    void emitPlatformNotification(input).catch((err) => {
        console.error("[platform-notification]", input.type, err);
    });
}

export async function listPlatformNotifications(params: {
    limit: number;
    offset: number;
    unreadOnly?: boolean;
}) {
    const cond = params.unreadOnly ? eq(platformNotifications.isRead, false) : undefined;

    const [totalRow] = cond
        ? await db.select({ n: count() }).from(platformNotifications).where(cond)
        : await db.select({ n: count() }).from(platformNotifications);

    const [unreadRow] = await db
        .select({ n: count() })
        .from(platformNotifications)
        .where(eq(platformNotifications.isRead, false));

    const rows = cond
        ? await db
              .select()
              .from(platformNotifications)
              .where(cond)
              .orderBy(desc(platformNotifications.createdAt))
              .limit(params.limit)
              .offset(params.offset)
        : await db
              .select()
              .from(platformNotifications)
              .orderBy(desc(platformNotifications.createdAt))
              .limit(params.limit)
              .offset(params.offset);

    return {
        items: rows.map((r) => ({
            id: r.id,
            type: r.type,
            title: r.title,
            body: r.body,
            businessId: r.businessId,
            productId: r.productId,
            metadata: r.metadata,
            isRead: r.isRead,
            createdAt: toIso(r.createdAt),
        })),
        total: totalRow?.n ?? 0,
        unread: unreadRow?.n ?? 0,
        limit: params.limit,
        offset: params.offset,
    };
}

export async function markPlatformNotificationsRead(ids?: string[]) {
    const now = new Date();
    if (ids && ids.length > 0) {
        await db
            .update(platformNotifications)
            .set({ isRead: true })
            .where(inArray(platformNotifications.id, ids));
    } else {
        await db
            .update(platformNotifications)
            .set({ isRead: true })
            .where(eq(platformNotifications.isRead, false));
    }
    return { updatedAt: now.toISOString() };
}

export function notifyShopCreated(businessId: string, name: string, email?: string | null) {
    notifyPlatformAdmin({
        type: "shop_created",
        title: "New shop registered",
        body: `${name}${email ? ` (${email})` : ""} signed up on VentraPOS.`,
        businessId,
        metadata: { shopName: name, email: email ?? null },
    });
}

export function notifyShopOnboarded(businessId: string, name: string, shopType?: string | null) {
    notifyPlatformAdmin({
        type: "shop_onboarded",
        title: "Shop completed onboarding",
        body: `${name} is live${shopType ? ` · ${shopType.replace(/_/g, " ")}` : ""}.`,
        businessId,
        metadata: { shopName: name, shopType: shopType ?? null },
        dedupeHours: 24,
    });
}

export function notifySubscriptionPastDue(businessId: string, name: string) {
    notifyPlatformAdmin({
        type: "subscription_past_due",
        title: "Subscription expired",
        body: `${name} passed its subscription end date and is now past due.`,
        businessId,
        metadata: { shopName: name },
        dedupeHours: 72,
    });
}

export function notifySubscriptionExpiring(
    businessId: string,
    name: string,
    daysLeft: number
) {
    notifyPlatformAdmin({
        type: "subscription_expiring",
        title: daysLeft <= 1 ? "Subscription ends tomorrow" : `Subscription ends in ${daysLeft} days`,
        body: `${name} subscription period ends soon. Review billing in Subscriptions.`,
        businessId,
        metadata: { shopName: name, daysLeft },
        dedupeHours: 20,
    });
}

export function notifyProductAdded(
    businessId: string,
    productId: string,
    productName: string,
    shopName?: string | null
) {
    notifyPlatformAdmin({
        type: "product_added",
        title: "New product added",
        body: `${productName}${shopName ? ` · ${shopName}` : ""}`,
        businessId,
        productId,
        metadata: { productName, shopName: shopName ?? null },
    });
}

export function notifyProductsBulkAdded(
    businessId: string,
    countAdded: number,
    shopName?: string | null
) {
    notifyPlatformAdmin({
        type: "products_bulk_added",
        title: "Bulk products imported",
        body: `${countAdded} product${countAdded === 1 ? "" : "s"} added${shopName ? ` to ${shopName}` : ""}.`,
        businessId,
        metadata: { count: countAdded, shopName: shopName ?? null },
        dedupeHours: 1,
    });
}

export async function resolveBusinessName(businessId: string): Promise<string | null> {
    const [row] = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    return row?.name ?? null;
}
