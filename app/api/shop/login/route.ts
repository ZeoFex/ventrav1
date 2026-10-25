import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/server/auth/password-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { shoppers } from "@/server/db/schema/shoppers";
import { shopperCookieOptions, signShopperToken } from "@/server/shop/shopper-auth";

const bodySchema = z.object({
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(1, "Enter your password"),
});

export async function POST(request: Request) {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Check the form and try again" },
            { status: 400 },
        );
    }

    const [row] = await db
        .select({
            id: shoppers.id,
            email: shoppers.email,
            phone: shoppers.phone,
            region: shoppers.region,
            passwordHash: shoppers.passwordHash,
        })
        .from(shoppers)
        .where(eq(shoppers.emailNormalized, parsed.data.email.toLowerCase()))
        .limit(1);

    if (!row || !(await verifyPassword(row.passwordHash, parsed.data.password))) {
        return NextResponse.json({ error: "Email or password is incorrect" }, { status: 401 });
    }

    const shopper = {
        id: row.id,
        email: row.email,
        phone: row.phone,
        region: row.region,
    };
    const token = await signShopperToken(shopper);
    const response = NextResponse.json({ shopper });
    response.cookies.set(COOKIE_NAMES.SHOPPER, token, shopperCookieOptions());
    return response;
}
