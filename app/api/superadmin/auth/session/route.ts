import { type NextRequest, NextResponse } from "next/server";
import { parseAuthorizationBearer } from "@/server/auth/api-request-auth";
import { verifySuperadminAccessToken } from "@/server/auth/superadmin-token-service";
import { getSuperadminById } from "@/server/auth/superadmin-service";

export const dynamic = "force-dynamic";

/** Current superadmin — `Authorization: Bearer` only (does not use tenant `__ventra_at` cookie). */
export async function GET(req: NextRequest) {
    const token = parseAuthorizationBearer(req.headers.get("authorization"));
    if (!token) {
        return NextResponse.json({ user: null });
    }
    try {
        const payload = await verifySuperadminAccessToken(token);
        const row = await getSuperadminById(payload.sub);
        if (!row || row.status !== "active") {
            return NextResponse.json({ user: null });
        }
        return NextResponse.json({
            user: {
                id: row.id,
                email: row.email,
                firstName: row.firstName,
                lastName: row.lastName,
            },
        });
    } catch {
        return NextResponse.json({ user: null });
    }
}
