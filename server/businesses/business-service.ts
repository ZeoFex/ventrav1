import { eq } from "drizzle-orm";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import { redis } from "../lib/redis";

const CACHE_KEYS = {
    BUSINESS_CONFIG: (id: string) => `biz:config:${id}`,
};

const CACHE_TTL = 300; // 5 minutes

export async function getBusinessConfig(businessId: string) {
    const cacheKey = CACHE_KEYS.BUSINESS_CONFIG(businessId);

    // Try cache first
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached as string);
        }
    } catch (err) {
        console.error("Redis fetch error:", err);
    }

    // Fetch from DB
    const [business] = await db
        .select({
            id: businesses.id,
            name: businesses.name,
            slug: businesses.slug,
            businessType: businesses.businessType,
            contactEmail: businesses.contactEmail,
            phone: businesses.phone,
            address: businesses.address,
            city: businesses.city,
            region: businesses.region,
            currency: businesses.currency,
            taxType: businesses.taxType,
            taxRate: businesses.taxRate,
            taxRegistered: businesses.taxRegistered,
            logoUrl: businesses.logoUrl,
            receiptHeader: businesses.receiptHeader,
            receiptFooter: businesses.receiptFooter,
        })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

    if (!business) return null;

    // Cache it
    try {
        await redis.set(cacheKey, JSON.stringify(business), "EX", CACHE_TTL);
    } catch (err) {
        console.error("Redis set error:", err);
    }

    return business;
}

export async function updateBusinessConfig(businessId: string, data: Partial<typeof businesses.$inferSelect>) {
    await db
        .update(businesses)
        .set({
            ...data,
            updatedAt: new Date(),
        })
        .where(eq(businesses.id, businessId));

    await invalidateBusinessConfig(businessId);
}

export async function invalidateBusinessConfig(businessId: string) {
    const cacheKey = CACHE_KEYS.BUSINESS_CONFIG(businessId);
    await redis.del(cacheKey);
}
