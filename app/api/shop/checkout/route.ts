import { NextResponse } from "next/server";
import { z } from "zod";
import { getShopperFromCookies, loadShopper } from "@/server/shop/shopper-auth";
import { placeShopOrder } from "@/server/shop/place-shop-order";

const bodySchema = z.object({
    paymentMethod: z.enum(["momo", "delivery"]),
    lines: z
        .array(
            z.object({
                productId: z.string().uuid(),
                quantity: z.number().int().min(1).max(99),
                variationId: z.string().uuid().optional(),
                preferences: z.string().trim().max(180).optional(),
            }),
        )
        .min(1)
        .max(40),
});

export async function POST(request: Request) {
    const session = await getShopperFromCookies();
    if (!session) {
        return NextResponse.json(
            { error: "Create a customer account before placing an order" },
            { status: 401 },
        );
    }
    const shopper = await loadShopper(session.id);
    if (!shopper) {
        return NextResponse.json({ error: "Sign in again to place this order" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Check the order and try again" },
            { status: 400 },
        );
    }

    try {
        const orders = await placeShopOrder(shopper, parsed.data.lines, parsed.data.paymentMethod);
        return NextResponse.json({ orders });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Could not place the order";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
