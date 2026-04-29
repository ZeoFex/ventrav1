import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Stateless JWT: client discards Bearer. No cookie to clear unless you add refresh later.
 */
export async function POST() {
    return NextResponse.json({ ok: true, message: "Client should discard the access token." });
}
