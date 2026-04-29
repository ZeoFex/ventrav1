import { type NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";

export const DEFAULT_PLATFORM_LIMIT = 200;
export const MAX_PLATFORM_LIMIT = 500;

export type PlatformListParams = {
    limit: number;
    offset: number;
    /** When set, only rows tied to this business (per-table rules in each route). */
    businessId: string | undefined;
};

export type PlatformListGate = { ok: false; response: NextResponse } | { ok: true; params: PlatformListParams };

/**
 * Valid platform key or superadmin JWT + pagination. Query: `limit`, `offset`, optional `businessId`.
 */
export async function parsePlatformListRequest(req: NextRequest): Promise<PlatformListGate> {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) {
        return { ok: false, response: gate };
    }
    const { searchParams } = new URL(req.url);
    const limit = Math.min(
        MAX_PLATFORM_LIMIT,
        Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_PLATFORM_LIMIT), 10) || DEFAULT_PLATFORM_LIMIT)
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const businessId = searchParams.get("businessId")?.trim() || undefined;
    return { ok: true, params: { limit, offset, businessId } };
}
