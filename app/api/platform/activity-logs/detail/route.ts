import { type NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { getPlatformActivityDetail } from "@/server/platform/platform-activity-detail";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/activity-logs/detail?id=sale:uuid
 * Also accepts kind=sale&id=uuid
 */
export async function GET(req: NextRequest) {
    try {
        const gate = await requirePlatformAccess(req);
        if (gate !== true) return gate;

        const { searchParams } = new URL(req.url);
        const kind = searchParams.get("kind")?.trim() || "";
        const id = searchParams.get("id")?.trim() || "";
        const entryId =
            searchParams.get("id")?.includes(":")
                ? searchParams.get("id")!.trim()
                : searchParams.get("entryId")?.trim() ||
                  (kind && id ? `${kind}:${id}` : "");

        if (!entryId) {
            return NextResponse.json({ error: "Missing log id" }, { status: 400 });
        }

        const detail = await getPlatformActivityDetail(entryId);
        if (!detail) {
            return NextResponse.json({ error: "Log not found" }, { status: 404 });
        }

        return NextResponse.json(detail);
    } catch (err) {
        console.error("[activity-logs/detail] failed", err);
        return NextResponse.json(
            {
                error:
                    err instanceof Error ? err.message : "Failed to load log details",
            },
            { status: 500 },
        );
    }
}

