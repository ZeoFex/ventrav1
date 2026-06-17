import { type NextRequest, NextResponse } from "next/server";
import { listSyncLogs } from "@/server/catalog/master-catalog-service";
import { gatePlatform, parsePagination } from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { limit, offset } = parsePagination(new URL(req.url).searchParams);
    const result = await listSyncLogs(limit, offset);
    return NextResponse.json(result);
}
