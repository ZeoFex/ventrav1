import { type NextRequest } from "next/server";
import { db } from "../db";
import { superadminAuditLogs } from "../db/schema/superadmin-audit-logs";
import { resolveActiveSuperadminFromRequest } from "../auth/api-request-auth";
import type { PlatformAction } from "./platform-activity-labels";

export type PlatformActivityInput = {
    action: PlatformAction | string;
    resource?: string;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
};

/**
 * Append-only platform admin activity. Never throws — logging must not fail the action.
 */
export async function logPlatformActivity(
    req: Request | NextRequest,
    input: PlatformActivityInput,
): Promise<void> {
    try {
        const actor = await resolveActiveSuperadminFromRequest(req);
        await db.insert(superadminAuditLogs).values({
            superadminId: actor?.id ?? null,
            action: input.action,
            resource: input.resource ?? null,
            resourceId: input.resourceId ?? null,
            metadata: {
                ...(input.metadata ?? {}),
                ...(actor
                    ? {
                          actorEmail: actor.email,
                          actorName: [actor.firstName, actor.lastName].filter(Boolean).join(" "),
                      }
                    : { actor: "platform_key" }),
            },
            ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "Unknown",
            userAgent: req.headers.get("user-agent") ?? "Unknown",
        });
    } catch (err) {
        console.error("[platform-activity] failed to write log", err);
    }
}
