import { NextResponse } from "next/server";
import { createRelaySession } from "@/lib/pos-relay-store";

export const dynamic = "force-dynamic";

export async function POST() {
  const { sessionId, token } = await createRelaySession();
  return NextResponse.json({
    sessionId,
    token,
    expiresInSec: 1800,
  });
}

