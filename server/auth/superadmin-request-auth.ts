import { type NextRequest, NextResponse } from "next/server";
import { parseAuthorizationBearer } from "./api-request-auth";
import { verifySuperadminAccessToken } from "./superadmin-token-service";
import { getSuperadminById } from "./superadmin-service";
import type { SuperadminTokenPayload } from "./superadmin-token-service";

export type SuperadminAuthed =
    | { ok: true; payload: SuperadminTokenPayload; superadminId: string }
    | { ok: false; response: NextResponse };

/**
 * Bearer superadmin JWT + active DB row (`/api/superadmin/*`).
 */
export async function requireSuperadminAuth(
    req: Request | NextRequest
): Promise<SuperadminAuthed> {
    const bearer = parseAuthorizationBearer(req.headers.get("authorization"));
    if (!bearer) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
    try {
        const payload = await verifySuperadminAccessToken(bearer);
        const row = await getSuperadminById(payload.sub);
        if (!row || row.status !== "active") {
            return {
                ok: false,
                response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
            };
        }
        return {
            ok: true,
            payload: payload as SuperadminTokenPayload,
            superadminId: row.id,
        };
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }
}
