import type { NextRequest } from "next/server";
import { DEFAULT_PUBLIC_SITE_URL } from "@/config/public-site";
import { env } from "../config/env";

const LOCAL_ORIGIN =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;

function normalizeBaseUrl(url: string): string {
    return url.trim().replace(/\/$/, "");
}

function isLocalOrigin(url: string): boolean {
    return LOCAL_ORIGIN.test(url);
}

/**
 * Public origin for links in outbound emails (verification, password reset).
 * Never uses localhost — local dev still sends links to the live VentraPOS site.
 */
export function resolveEmailLinkBaseUrl(): string {
    const dedicated = env.EMAIL_LINK_BASE_URL?.trim();
    if (dedicated) return normalizeBaseUrl(dedicated);

    const fromEnv = env.NEXT_PUBLIC_APP_URL?.trim();
    if (fromEnv && !isLocalOrigin(fromEnv)) {
        return normalizeBaseUrl(fromEnv);
    }

    return DEFAULT_PUBLIC_SITE_URL;
}

/** Resolve the public app origin from an incoming request (e.g. password reset form). */
export function resolveAppBaseUrl(req?: NextRequest): string {
    if (req) {
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host");
        if (host) return `${protocol}://${host}`;
    }
    return normalizeBaseUrl(env.NEXT_PUBLIC_APP_URL || DEFAULT_PUBLIC_SITE_URL);
}
