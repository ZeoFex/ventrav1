import { type NextRequest, NextResponse } from "next/server";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import {
    DEFAULT_PLATFORM_LIMIT,
    MAX_PLATFORM_LIMIT,
} from "@/server/platform/platform-list";

export async function gatePlatform(req: NextRequest) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return { ok: false as const, response: gate };
    return { ok: true as const };
}

export function parsePagination(searchParams: URLSearchParams) {
    const limit = Math.min(
        MAX_PLATFORM_LIMIT,
        Math.max(
            1,
            parseInt(searchParams.get("limit") ?? String(DEFAULT_PLATFORM_LIMIT), 10) ||
                DEFAULT_PLATFORM_LIMIT
        )
    );
    const offset = Math.max(
        0,
        parseInt(searchParams.get("offset") ?? "0", 10) || 0
    );
    return { limit, offset };
}

export function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}
