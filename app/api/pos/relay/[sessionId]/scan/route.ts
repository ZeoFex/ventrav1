import { NextResponse } from "next/server";
import { pushScan } from "@/lib/pos-relay-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const token = typeof rec.token === "string" ? rec.token : "";
  const barcode = typeof rec.barcode === "string" ? rec.barcode : "";

  if (!token || !barcode.trim()) {
    return NextResponse.json({ error: "missing token or barcode" }, { status: 400 });
  }
  const ok = await pushScan(sessionId, token, barcode);
  if (!ok) {
    return NextResponse.json({ error: "invalid or expired session" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
