import { redis } from "@/server/lib/redis";

const PREFIX = "zuri:rl";

function dayKey(d = new Date()): string {
    return d.toISOString().slice(0, 10);
}

/**
 * Per-user daily request budget for Zuri (support KB chat). Returns true if blocked.
 */
export async function isZuriRateLimited(userId: string): Promise<boolean> {
    const dailyCap = Number(process.env.ZURI_DAILY_CAP_PER_USER ?? 100);
    const cap = Number.isFinite(dailyCap) && dailyCap >= 1 ? Math.floor(dailyCap) : 100;

    const key = `${PREFIX}:${userId}:${dayKey()}`;
    const n = await redis.incr(key);
    if (n === 1) {
        await redis.expire(key, 48 * 60 * 60);
    }
    return n > cap;
}
