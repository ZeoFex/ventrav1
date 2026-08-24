import { type NextRequest } from "next/server";
import { db } from "../db";
import { auditLogs } from "../db/schema/audit-logs";

export type ShopActivityInput = {
    req?: Request | NextRequest;
    userId?: string | null;
    businessId: string;
    action: string;
    resource?: string;
    resourceId?: string | null;
    detail?: string;
    metadata?: Record<string, unknown>;
};

/**
 * Append-only shop staff activity. Never throws — logging must not fail the action.
 */
export async function logShopActivity(input: ShopActivityInput): Promise<void> {
    try {
        await db.insert(auditLogs).values({
            userId: input.userId ?? null,
            businessId: input.businessId,
            action: input.action,
            resource: input.resource ?? null,
            resourceId: input.resourceId ?? null,
            metadata: {
                ...(input.metadata ?? {}),
                ...(input.detail ? { detail: input.detail } : {}),
            },
            ipAddress:
                input.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
            userAgent: input.req?.headers.get("user-agent") ?? null,
        });
    } catch (err) {
        console.error("[shop-activity] failed to write log", err);
    }
}
