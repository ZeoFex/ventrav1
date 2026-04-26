import { redis } from "./redis";

const PREFIX = "rl:";

/**
 * Fixed-window limiter using Redis INCR + EXPIRE.
 * Returns { ok: false } when the count exceeds `limit` within the window.
 */
export async function rateLimitKey(
    key: string,
    limit: number,
    windowSec: number
): Promise<{ ok: true } | { ok: false }> {
    try {
        const k = `${PREFIX}${key}`;
        const n = await redis.incr(k);
        if (n === 1) {
            await redis.expire(k, windowSec);
        }
        if (n > limit) {
            return { ok: false };
        }
        return { ok: true };
    } catch (e) {
        console.warn("[rateLimitKey] Redis error; allowing request:", e);
        return { ok: true };
    }
}
