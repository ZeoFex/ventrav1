import { NextResponse } from "next/server";
import { pollScans } from "@/lib/pos-relay-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }
  const scans = await pollScans(sessionId, token);
  return NextResponse.json({ scans });
}
