import { tool, zodSchema } from "ai";
import { z } from "zod";
import { redis } from "@/server/lib/redis";
import type { ToolContext } from "../types";

/**
 * Low-risk “write”: stores a short internal note for support / analytics (per business).
 */
export function saveCopilotFeedbackTool(ctx: ToolContext) {
  return tool({
    description:
      "Save a short feedback or issue note for the merchant (visible to the business team in internal logs).",
    inputSchema: zodSchema(
      z.object({
        message: z.string().min(1).max(2000),
        idempotencyKey: z.string().min(8).max(128).optional(),
      }),
    ),
    execute: async ({ message, idempotencyKey }) => {
      const key = `copilot:feedback:${ctx.businessId}`;
      const row = JSON.stringify({
        ts: new Date().toISOString(),
        userId: ctx.userId,
        message: message.slice(0, 2000),
        idempotencyKey: idempotencyKey ?? null,
      });
      await redis.lpush(key, row);
      await redis.ltrim(key, 0, 99);
      return { saved: true };
    },
  });
}
