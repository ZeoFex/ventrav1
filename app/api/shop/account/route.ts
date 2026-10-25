import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createPasswordSchema } from "@/lib/password-requirements";
import { GHANA_REGIONS } from "@/app/components/onboarding/constants";
import { hashPassword } from "@/server/auth/password-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { shoppers } from "@/server/db/schema/shoppers";
import { users } from "@/server/db/schema/users";
import { shopperCookieOptions, signShopperToken } from "@/server/shop/shopper-auth";

const bodySchema = z
    .object({
        email: z.string().trim().email("Enter a valid email"),
        password: createPasswordSchema(),
        confirmPassword: z.string(),
        phone: z.string().trim().min(10, "Enter a phone number").max(20),
        region: z.string().refine(
            (value) => (GHANA_REGIONS as readonly string[]).includes(value),
            "Select a region",
        ),
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export async function POST(request: Request) {
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Check the form and try again";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const emailNormalized = parsed.data.email.toLowerCase();
    const [owner] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.emailNormalized, emailNormalized))
        .limit(1);
    if (owner) {
        return NextResponse.json(
            { error: "This email belongs to a shop account. Use a different email to shop as a customer." },
            { status: 409 },
        );
    }

    const [existing] = await db
        .select({ id: shoppers.id })
        .from(shoppers)
        .where(eq(shoppers.emailNormalized, emailNormalized))
        .limit(1);
    if (existing) {
        return NextResponse.json(
            { error: "An account with this email already exists. Sign in instead." },
            { status: 409 },
        );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const [created] = await db
        .insert(shoppers)
        .values({
            email: parsed.data.email.trim(),
            emailNormalized,
            passwordHash,
            phone: parsed.data.phone,
            region: parsed.data.region,
        })
        .returning({
            id: shoppers.id,
            email: shoppers.email,
            phone: shoppers.phone,
            region: shoppers.region,
        });

    const token = await signShopperToken(created);
    const response = NextResponse.json({ shopper: created });
    response.cookies.set(COOKIE_NAMES.SHOPPER, token, shopperCookieOptions());
    return response;
}
