import { NextResponse } from "next/server";
import { createRelaySession } from "@/lib/pos-relay-store";

export const dynamic = "force-dynamic";

export async function POST() {
  console.log(`[api:relay] POST /api/pos/relay — creating new session`);
  const { sessionId, token } = await createRelaySession();
  console.log(`[api:relay] ✅ session created: sessionId=${sessionId}`);
  return NextResponse.json({
    sessionId,
    token,
    expiresInSec: 1800,
  });
}

