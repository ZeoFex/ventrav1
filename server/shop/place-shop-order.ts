import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { customers } from "@/server/db/schema/customers";
import { notifications } from "@/server/db/schema/notifications";
import { productVariations, products } from "@/server/db/schema/products";
import { shopConversations, shopMessages } from "@/server/db/schema/shop-conversations";
import { createCustomerOrder } from "@/server/customer-orders/customer-order-service";
import type { ShopperProfile } from "./shopper-auth";

export type ShopCheckoutLine = {
    productId: string;
    quantity: number;
    variationId?: string;
    preferences?: string;
};

export type ShopPaymentChoice = "momo" | "delivery";

const PAYMENT_LABEL: Record<ShopPaymentChoice, string> = {
    momo: "Mobile Money",
    delivery: "Pay on delivery",
};

function customerName(email: string): string {
    const local = email.split("@")[0] ?? "Customer";
    const words = local
        .split(/[._-]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 3);
    if (words.length === 0) return "Customer";
    return words
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

export async function placeShopOrder(
    shopper: ShopperProfile,
    lines: ShopCheckoutLine[],
    paymentMethod: ShopPaymentChoice,
) {
    const ids = [...new Set(lines.map((line) => line.productId))];
    const rows = await db
        .select({
            id: products.id,
            name: products.name,
            priceGhs: products.priceGhs,
            businessId: products.businessId,
            branchId: products.branchId,
            status: products.status,
            businessStatus: businesses.status,
            shopName: businesses.name,
        })
        .from(products)
        .innerJoin(businesses, eq(products.businessId, businesses.id))
        .where(inArray(products.id, ids));

    const byId = new Map(rows.map((row) => [row.id, row]));
    const variationIds = [...new Set(lines.map((line) => line.variationId).filter((id): id is string => Boolean(id)))];
    const variationRows = variationIds.length
        ? await db
              .select({
                  id: productVariations.id,
                  productId: productVariations.productId,
                  name: productVariations.name,
                  priceGhs: productVariations.priceGhs,
              })
              .from(productVariations)
              .where(inArray(productVariations.id, variationIds))
        : [];
    const variationById = new Map(variationRows.map((row) => [row.id, row]));
    const resolved = lines.map((line) => {
        const product = byId.get(line.productId);
        if (!product || product.status !== "active" || product.businessStatus !== "active") {
            throw new Error("One of the products is no longer available");
        }
        const quantity = Math.floor(line.quantity);
        if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
            throw new Error("Each item needs a quantity between 1 and 99");
        }
        const variation = line.variationId ? variationById.get(line.variationId) : undefined;
        if (line.variationId && (!variation || variation.productId !== product.id)) {
            throw new Error("Choose an available option for each item");
        }
        const unitPrice = roundMoney(
            variation?.priceGhs != null ? Number(variation.priceGhs) : Number(product.priceGhs),
        );
        const preferences = (line.preferences ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 180);
        const note = preferences ? ` (${preferences})` : "";
        const productName = `${product.name}${note}`.slice(0, 255);
        return {
            productId: product.id,
            variationId: variation?.id ?? null,
            productName,
            quantity,
            unitPriceGhs: unitPrice,
            lineTotalGhs: roundMoney(unitPrice * quantity),
            businessId: product.businessId,
            branchId: product.branchId,
            shopName: product.shopName,
        };
    });

    const groups = new Map<string, typeof resolved>();
    for (const line of resolved) {
        const bucket = groups.get(line.businessId) ?? [];
        bucket.push(line);
        groups.set(line.businessId, bucket);
    }

    const name = customerName(shopper.email);
    const placed: {
        shopName: string;
        invoiceId: string;
        totalGhs: number;
        conversationId: string;
    }[] = [];

    for (const [businessId, group] of groups) {
        const [existing] = await db
            .select({ id: customers.id })
            .from(customers)
            .where(and(eq(customers.businessId, businessId), eq(customers.phone, shopper.phone)))
            .limit(1);

        let customerId = existing?.id;
        if (!customerId) {
            const [created] = await db
                .insert(customers)
                .values({
                    businessId,
                    branchId: group.find((line) => line.branchId)?.branchId ?? null,
                    name,
                    phone: shopper.phone,
                    email: shopper.email,
                    status: "active",
                })
                .returning({ id: customers.id });
            customerId = created.id;
        }

        const subtotal = roundMoney(group.reduce((sum, line) => sum + line.lineTotalGhs, 0));
        const branchId = group.find((line) => line.branchId)?.branchId ?? null;
        const order = await createCustomerOrder(businessId, branchId, null, {
            subtotalGhs: subtotal,
            taxGhs: 0,
            discountGhs: 0,
            totalGhs: subtotal,
            customerId,
            lines: group.map((line) => ({
                productId: line.productId,
                variationId: line.variationId,
                quantity: line.quantity,
                productName: line.productName,
                unitPriceGhs: line.unitPriceGhs,
                lineTotalGhs: line.lineTotalGhs,
            })),
        });

        const summary = group
            .map((line) => `${line.quantity}× ${line.productName}`)
            .join(", ")
            .slice(0, 360);
        await db.insert(notifications).values({
            businessId,
            branchId,
            title: "Someone wants to order",
            body: `${name} (${shopper.phone}) in ${shopper.region} wants to order ${summary}. They will pay by ${PAYMENT_LABEL[paymentMethod]}. Order ${order.invoiceId}, GHS ${order.totalGhs.toFixed(2)}. Open Ecommerce orders to reply.`,
            icon: "package",
        });

        const [conversation] = await db
            .insert(shopConversations)
            .values({
                businessId,
                branchId,
                customerOrderId: order.orderId,
                shopperId: shopper.id,
                invoiceId: order.invoiceId,
                shopName: group[0]!.shopName,
                customerName: name,
                customerPhone: shopper.phone,
                customerRegion: shopper.region,
                totalGhs: order.totalGhs.toFixed(2),
            })
            .returning({ id: shopConversations.id });

        await db.insert(shopMessages).values({
            conversationId: conversation.id,
            sender: "customer",
            senderName: name,
            body: `I placed order ${order.invoiceId} (${summary}). I will pay by ${PAYMENT_LABEL[paymentMethod]}.`,
        });

        placed.push({
            shopName: group[0]!.shopName,
            invoiceId: order.invoiceId,
            totalGhs: order.totalGhs,
            conversationId: conversation.id,
        });
    }

    return placed;
}
