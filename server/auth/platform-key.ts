import crypto from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { env } from "../config/env";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import { users } from "../db/schema/users";
import type { AuthTokenPayload } from "./token-service";
import { nanoid } from "nanoid";

function parseConfiguredKeys(): string[] {
    return (env.VENTRA_PLATFORM_API_KEYS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((k) => k.length >= 32);
}

/**
 * `false` if env has no keys or the supplied value does not match (timing-safe per length match).
 */
export function isValidPlatformKey(supplied: string | null | undefined): boolean {
    if (!supplied) {
        return false;
    }
    const keys = parseConfiguredKeys();
    if (keys.length === 0) {
        return false;
    }
    const buf = Buffer.from(supplied, "utf8");
    for (const k of keys) {
        if (k.length !== supplied.length) {
            continue;
        }
        try {
            if (crypto.timingSafeEqual(buf, Buffer.from(k, "utf8"))) {
                return true;
            }
        } catch {
            // length edge case
        }
    }
    return false;
}

/**
 * Resolves a real user + business for act-as: same `sub` as that user so downstream code
 * (POS, session, etc.) continues to work.
 */
export async function buildPlatformActAsPayload(
    businessId: string
): Promise<AuthTokenPayload | null> {
    const [biz] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);
    if (!biz) {
        return null;
    }
    const [u] = await db
        .select()
        .from(users)
        .where(eq(users.businessId, businessId))
        .orderBy(asc(users.createdAt))
        .limit(1);
    if (!u) {
        return null;
    }
    return {
        sub: u.id,
        email: u.email,
        name: u.firstName,
        bid: biz.id,
        role: "owner",
        perms: [],
        plan: biz.plan,
        jti: `platform-${nanoid(12)}`,
        img: u.avatarUrl ?? null,
    };
}
