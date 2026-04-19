import { redis } from "@/server/lib/redis";
import type { CopilotScope } from "./scope";

const LIST_MAX = 500;
const PREFIX = "copilot:audit";

export type CopilotAuditEvent = {
  ts: string;
  userId: string;
  businessId: string;
  kind: "tool" | "resume" | "idempotent_skip";
  toolName?: string;
  ok?: boolean;
  summary?: string;
  idempotencyKey?: string;
};

export async function logCopilotAudit(
  scope: CopilotScope,
  event: Omit<CopilotAuditEvent, "ts" | "userId" | "businessId">,
): Promise<void> {
  const row: CopilotAuditEvent = {
    ts: new Date().toISOString(),
    userId: scope.userId,
    businessId: scope.businessId,
    ...event,
  };
  const key = `${PREFIX}:${scope.businessId}`;
  try {
    await redis.lpush(key, JSON.stringify(row));
    await redis.ltrim(key, 0, LIST_MAX - 1);
  } catch {
    /* ignore audit failures */
  }
}
