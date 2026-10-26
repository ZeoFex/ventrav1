import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createPasswordSchema } from "@/lib/password-requirements";
import { GHANA_REGIONS } from "@/app/components/onboarding/constants";
import { hashPassword, verifyPassword } from "@/server/auth/password-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { shoppers } from "@/server/db/schema/shoppers";
import {
    getShopperFromCookies,
    shopperCookieOptions,
    shopperPhoneKey,
    signShopperToken,
} from "@/server/shop/shopper-auth";

const regionSchema = z.string().refine(
    (value) => (GHANA_REGIONS as readonly string[]).includes(value),
    "Select a region",
);

const createSchema = z
    .object({
        password: createPasswordSchema(),
        confirmPassword: z.string(),
        phone: z.string().trim().min(10, "Enter a phone number").max(20),
        region: regionSchema,
    })
    .refine((value) => value.password === value.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

const updateSchema = z
    .object({
        phone: z.string().trim().min(10, "Enter a phone number").max(20),
        region: regionSchema,
        currentPassword: z.string().min(1, "Enter your current password"),
        newPassword: z.string().optional(),
        confirmPassword: z.string().optional(),
    })
    .superRefine((value, ctx) => {
        const next = value.newPassword?.trim() ?? "";
        if (!next) return;
        const parsed = createPasswordSchema().safeParse(next);
        if (!parsed.success) {
            ctx.addIssue({
                code: "custom",
                message: parsed.error.issues[0]?.message ?? "Choose a stronger password",
                path: ["newPassword"],
            });
        }
        if (next !== (value.confirmPassword ?? "")) {
            ctx.addIssue({
                code: "custom",
                message: "Passwords do not match",
                path: ["confirmPassword"],
            });
        }
    });

export async function POST(request: Request) {
    const json = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "Check the form and try again";
        return NextResponse.json({ error: message }, { status: 400 });
    }

    const phoneKey = shopperPhoneKey(parsed.data.phone);
    if (!phoneKey) {
        return NextResponse.json({ error: "Enter a Ghana phone number" }, { status: 400 });
    }

    const [existing] = await db
        .select({ id: shoppers.id })
        .from(shoppers)
        .where(eq(shoppers.phoneNormalized, phoneKey))
        .limit(1);
    if (existing) {
        return NextResponse.json(
            { error: "This phone number already has a customer account. Sign in instead." },
            { status: 409 },
        );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const [created] = await db
        .insert(shoppers)
        .values({
            passwordHash,
            phone: parsed.data.phone,
            phoneNormalized: phoneKey,
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

export async function PATCH(request: Request) {
    const session = await getShopperFromCookies();
    if (!session) {
        return NextResponse.json({ error: "Sign in again" }, { status: 401 });
    }

    const json = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Check the form and try again" },
            { status: 400 },
        );
    }

    const phoneKey = shopperPhoneKey(parsed.data.phone);
    if (!phoneKey) {
        return NextResponse.json({ error: "Enter a Ghana phone number" }, { status: 400 });
    }

    const [row] = await db
        .select({
            id: shoppers.id,
            passwordHash: shoppers.passwordHash,
            phoneNormalized: shoppers.phoneNormalized,
        })
        .from(shoppers)
        .where(eq(shoppers.id, session.id))
        .limit(1);
    if (!row || !(await verifyPassword(row.passwordHash, parsed.data.currentPassword))) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    if (phoneKey !== row.phoneNormalized) {
        const [taken] = await db
            .select({ id: shoppers.id })
            .from(shoppers)
            .where(eq(shoppers.phoneNormalized, phoneKey))
            .limit(1);
        if (taken) {
            return NextResponse.json(
                { error: "That phone number is already used by another customer." },
                { status: 409 },
            );
        }
    }

    const nextPassword = parsed.data.newPassword?.trim();
    const [updated] = await db
        .update(shoppers)
        .set({
            phone: parsed.data.phone,
            phoneNormalized: phoneKey,
            region: parsed.data.region,
            ...(nextPassword ? { passwordHash: await hashPassword(nextPassword) } : {}),
            updatedAt: new Date(),
        })
        .where(eq(shoppers.id, session.id))
        .returning({
            id: shoppers.id,
            email: shoppers.email,
            phone: shoppers.phone,
            region: shoppers.region,
        });

    const token = await signShopperToken(updated);
    const response = NextResponse.json({ shopper: updated });
    response.cookies.set(COOKIE_NAMES.SHOPPER, token, shopperCookieOptions());
    return response;
}
