import { NextResponse } from "next/server";
import { isSuperadminJwtConfigured } from "@/server/auth/superadmin-token-service";
import { countSuperadmins } from "@/server/auth/superadmin-service";

export const dynamic = "force-dynamic";

/** Public: whether the first admin account can be created from the portal. */
export async function GET() {
    if (!isSuperadminJwtConfigured()) {
        return NextResponse.json({
            configured: false,
            canBootstrap: false,
            hasAccounts: false,
        });
    }

    const total = await countSuperadmins();
    return NextResponse.json({
        configured: true,
        canBootstrap: total === 0,
        hasAccounts: total > 0,
    });
}
