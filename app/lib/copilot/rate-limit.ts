import { redis } from "@/server/lib/redis";

const PREFIX = "copilot:rl";

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Per-user daily request budget for Zuri in-dashboard assistant. Returns false if allowed, true if blocked.
 */
export async function isCopilotRateLimited(userId: string): Promise<boolean> {
  const dailyCap = Number(process.env.COPILOT_DAILY_CAP_PER_USER ?? 200);
  const cap =
    Number.isFinite(dailyCap) && dailyCap >= 1 ? Math.floor(dailyCap) : 200;

  const key = `${PREFIX}:${userId}:${dayKey()}`;
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, 48 * 60 * 60);
  }
  return n > cap;
}
