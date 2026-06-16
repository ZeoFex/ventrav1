import { type NextRequest, NextResponse } from "next/server";
import { backfillMasterCatalogFromTenants } from "@/server/catalog/master-catalog-service";
import { gatePlatform } from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/** POST — pull all tenant products into the master catalog (idempotent). */
export async function POST(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(
        1000,
        Math.max(50, parseInt(String(body?.batchSize ?? 500), 10) || 500)
    );

    const result = await backfillMasterCatalogFromTenants(batchSize);
    return NextResponse.json({ success: true, ...result });
}
