import { NextRequest, NextResponse } from "next/server";
import { kbSearchMeta } from "@/server/knowledge-base";

export const dynamic = "force-dynamic";

/** Public search over Help Centre Markdown corpus (merchant-safe metadata only). */
export async function GET(req: NextRequest) {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (!q) {
        return NextResponse.json({ results: [] });
    }
    const results = kbSearchMeta(q, 24);
    return NextResponse.json({ results });
}
