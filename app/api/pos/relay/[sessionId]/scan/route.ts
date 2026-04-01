import { NextResponse } from "next/server";
import { pushScan } from "@/lib/pos-relay-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  console.log(`[api:scan] POST /api/pos/relay/${sessionId}/scan`);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.log(`[api:scan] ❌ invalid JSON body`);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    console.log(`[api:scan] ❌ body is not an object`);
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const token = typeof rec.token === "string" ? rec.token : "";
  const barcode = typeof rec.barcode === "string" ? rec.barcode : "";
  console.log(`[api:scan] token=${token.slice(0, 8)}… barcode="${barcode}"`);

  if (!token || !barcode.trim()) {
    console.log(`[api:scan] ❌ missing token or barcode`);
    return NextResponse.json({ error: "missing token or barcode" }, { status: 400 });
  }
  const ok = await pushScan(sessionId, token, barcode);
  if (!ok) {
    console.log(`[api:scan] ❌ pushScan returned false — session invalid or expired`);
    return NextResponse.json({ error: "invalid or expired session" }, { status: 404 });
  }
  console.log(`[api:scan] ✅ barcode "${barcode}" pushed to session ${sessionId}`);
  return NextResponse.json({ ok: true });
}
