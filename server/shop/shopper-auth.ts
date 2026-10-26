import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { phoneNormalizedKey } from "@/server/auth/phone-utils";
import { ACCESS_TOKEN_TTL, COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { shoppers } from "@/server/db/schema/shoppers";

const ISSUER = "ventrapos-shopper";
const AUDIENCE = "ventrapos:shop";

export type ShopperProfile = {
    id: string;
    email: string | null;
    phone: string;
    region: string;
};

/** Digits-only Ghana key used to look a customer up by phone. */
export function shopperPhoneKey(phone: string): string | null {
    const key = phoneNormalizedKey(phone);
    if (key.length < 12 || !key.startsWith("233")) return null;
    return key;
}

function secret(): Uint8Array {
    const value = process.env.JWT_SECRET;
    if (!value || value.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters");
    }
    return new TextEncoder().encode(value);
}

export async function signShopperToken(profile: ShopperProfile): Promise<string> {
    return new SignJWT({
        email: profile.email ?? "",
        phone: profile.phone,
        region: profile.region,
        role: "shopper",
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(profile.id)
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .sign(secret());
}

export function shopperCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: ACCESS_TOKEN_TTL,
    };
}

export async function readShopperToken(token: string): Promise<ShopperProfile | null> {
    try {
        const { payload } = await jwtVerify(token, secret(), {
            issuer: ISSUER,
            audience: AUDIENCE,
        });
        if (payload.role !== "shopper" || typeof payload.sub !== "string") return null;
        if (typeof payload.email !== "string" || typeof payload.phone !== "string") return null;
        if (typeof payload.region !== "string") return null;
        return {
            id: payload.sub,
            email: payload.email || null,
            phone: payload.phone,
            region: payload.region,
        };
    } catch {
        return null;
    }
}

export async function getShopperFromCookies(): Promise<ShopperProfile | null> {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAMES.SHOPPER)?.value;
    if (!token) return null;
    return readShopperToken(token);
}

export async function loadShopper(id: string): Promise<ShopperProfile | null> {
    const [row] = await db
        .select({
            id: shoppers.id,
            email: shoppers.email,
            phone: shoppers.phone,
            region: shoppers.region,
        })
        .from(shoppers)
        .where(eq(shoppers.id, id))
        .limit(1);
    return row ?? null;
}
