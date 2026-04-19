import { redis } from "@/server/lib/redis";

const PREFIX = "copilot:idem";

/**
 * Runs fn once per idempotency key per 24h window; otherwise returns skipped=true.
 */
export async function withCopilotIdempotency<T>(
  key: string | undefined,
  fn: () => Promise<T>,
): Promise<{ skipped: boolean; value?: T }> {
  if (!key || key.trim() === "") {
    const value = await fn();
    return { skipped: false, value };
  }
  const redisKey = `${PREFIX}:${key.trim()}`;
  const ok = await redis.set(redisKey, "1", "EX", 86400, "NX");
  if (ok !== "OK") {
    return { skipped: true };
  }
  const value = await fn();
  return { skipped: false, value };
}
