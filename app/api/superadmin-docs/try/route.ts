import { type NextRequest, NextResponse } from "next/server";
import { isValidPlatformKey } from "@/server/auth/platform-key";

export const dynamic = "force-dynamic";

const MAX_PATH_LEN = 4096;

/**
 * Same-origin GET proxy for the superadmin docs sandbox.
 * Browser direct fetch to /api/platform/* can stall in some dev setups; the server
 * forwards the request and returns the real status/body to the page.
 */
export async function POST(req: NextRequest) {
    const key = req.headers.get("X-Ventra-Platform-Key");
    if (!isValidPlatformKey(key)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let path = "";
    try {
        const body = (await req.json()) as { path?: string };
        path = typeof body.path === "string" ? body.path.trim() : "";
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!path || path.length > MAX_PATH_LEN) {
        return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
    }
    if (path.includes("..") || !path.startsWith("/api/platform/")) {
        return NextResponse.json({ error: "Path must be under /api/platform/*" }, { status: 400 });
    }

    const target = new URL(path, req.nextUrl.origin);
    if (target.origin !== req.nextUrl.origin) {
        return NextResponse.json({ error: "Path origin mismatch" }, { status: 400 });
    }

    const r = await fetch(target, {
        method: "GET",
        cache: "no-store",
        headers: { "X-Ventra-Platform-Key": key! },
    });
    const text = await r.text();
    return new NextResponse(text, {
        status: r.status,
        statusText: r.statusText,
        headers: { "content-type": r.headers.get("content-type") || "text/plain; charset=utf-8" },
    });
}
