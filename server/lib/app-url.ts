import type { NextRequest } from "next/server";
import { env } from "@/server/config/env";

/** Resolve the public app origin for links in emails. */
export function resolveAppBaseUrl(req?: NextRequest): string {
    if (req) {
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host");
        if (host) return `${protocol}://${host}`;
    }
    return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}
