import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { getPlatformActivityFeed } from "@/server/platform/platform-activity-feed";
import { getPlatformActivityDetail } from "@/server/platform/platform-activity-detail";

export const dynamic = "force-dynamic";

const uuidParam = z.string().uuid();

function jsonError(error: string, status: number) {
    return NextResponse.json({ error }, { status });
}

/**
 * GET /api/platform/activity-logs
 * Unified timeline of platform admin actions and every shop's operational activity.
 * Query: limit, offset, q, businessId, source=all|platform|shops
 * Detail: entryId=sale:uuid  OR  kind=sale&id=uuid
 */
export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) return g.response;

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind")?.trim() || "";
    const id = searchParams.get("id")?.trim() || "";
    const entryId =
        searchParams.get("entryId")?.trim() ||
        (kind && id ? `${kind}:${id}` : "");

    if (entryId) {
        try {
            const detail = await getPlatformActivityDetail(entryId);
            if (!detail) return jsonError("Log not found", 404);
            return NextResponse.json(detail);
        } catch (err) {
            console.error("[activity-logs] detail failed", err);
            return jsonError(
                err instanceof Error ? err.message : "Failed to load log details",
                500,
            );
        }
    }

    const { limit, offset, businessId } = g.params;
    const q = searchParams.get("q")?.trim() || undefined;
    const sourceRaw = searchParams.get("source")?.trim() || "all";
    const source =
        sourceRaw === "platform" || sourceRaw === "shops" ? sourceRaw : "all";
    const shopId =
        businessId && uuidParam.safeParse(businessId).success ? businessId : undefined;

    try {
        const result = await getPlatformActivityFeed({
            limit,
            offset,
            businessId: shopId,
            q,
            source,
        });
        return NextResponse.json(result);
    } catch (err) {
        console.error("[activity-logs] feed failed", err);
        return jsonError(
            err instanceof Error ? err.message : "Failed to load activity",
            500,
        );
    }
}

