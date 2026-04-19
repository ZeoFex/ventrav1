import { tool, zodSchema } from "ai";
import { z } from "zod";
import { nanoid } from "nanoid";
import { redis } from "@/server/lib/redis";
import { signResumeToken } from "../../resume-token";
import type { ToolContext } from "../types";

/**
 * Gated “write”: does not export immediately — stores intent + returns resume token for confirmation flow.
 */
export function requestSalesExportTool(ctx: ToolContext) {
  return tool({
    description:
      "Request a sensitive sales data export. This schedules a confirmation step — the user must approve in the Copilot UI before any export runs.",
    inputSchema: zodSchema(
      z.object({
        reason: z.string().min(1).max(500),
        idempotencyKey: z.string().min(8).max(128).optional(),
      }),
    ),
    execute: async ({ reason, idempotencyKey }) => {
      const pendingId = nanoid();
      const payload = {
        v: 1 as const,
        kind: "export_sales_csv" as const,
        pendingId,
        businessId: ctx.businessId,
        userId: ctx.userId,
        reason: reason.slice(0, 500),
        idempotencyKey: idempotencyKey ?? null,
      };
      await redis.setex(
        `copilot:pending:${ctx.businessId}:${pendingId}`,
        600,
        JSON.stringify(payload),
      );
      const resumeToken = await signResumeToken({
        pendingId,
        businessId: ctx.businessId,
        userId: ctx.userId,
        kind: "export_sales_csv",
      });
      return {
        status: "pending_confirmation" as const,
        message:
          "Export request recorded. The user should confirm in Copilot to proceed.",
        resumeToken,
        pendingId,
      };
    },
  });
}
