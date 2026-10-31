import { type NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { getStorefrontMeta } from "@/server/platform/platform-storefront";

export const dynamic = "force-dynamic";

/**
 * GET /api/platform/storefront/meta
 * Shops, types, and categories for the admin-only storefront.
 */
export async function GET(req: NextRequest) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;
    try {
        const meta = await getStorefrontMeta();
        return NextResponse.json(meta);
    } catch (err) {
        console.error("[storefront/meta]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to load storefront" },
            { status: 500 },
        );
    }
}
