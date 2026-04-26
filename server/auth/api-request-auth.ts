import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type AuthTokenPayload } from "./token-service";
import { COOKIE_NAMES } from "../config/auth-config";

/** `Authorization: Bearer` or access cookie. Malformed `Bearer` (no token) yields null. */
function parseAuthorizationBearer(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    const m = /^Bearer\s+(\S+)$/i.exec(trimmed);
    if (m) return m[1]!;
    if (/^bearer(\s+|$)/i.test(trimmed) && !m) {
        return null;
    }
    return null;
}

function parseAccessCookieValue(cookieHeader: string | null, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(";")) {
        const p = part.trim();
        if (p.startsWith(`${name}=`)) {
            return decodeURIComponent(p.slice(name.length + 1).trim());
        }
    }
    return null;
}

/**
 * Read JWT from `Authorization: Bearer` or the access HTTP-only cookie.
 * Works in Route Handlers with a standard `Request` or `NextRequest` (for cookies on NextRequest).
 */
export function getAccessTokenStringFromRequest(req: Request | NextRequest): string | null {
    const bearer = parseAuthorizationBearer(req.headers.get("authorization"));
    if (bearer) return bearer;
    if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
        const c = (req as NextRequest).cookies.get(COOKIE_NAMES.ACCESS);
        if (c?.value) return c.value;
    }
    return parseAccessCookieValue(req.headers.get("cookie"), COOKIE_NAMES.ACCESS);
}

/**
 * `Authorization: Bearer` or access cookie when the handler does not take a `Request`
 * (uses Next.js `headers()` + `cookies()`).
 */
export async function getAccessTokenStringFromContext(): Promise<string | null> {
    const h = await headers();
    const bearer = parseAuthorizationBearer(h.get("authorization"));
    if (bearer) return bearer;
    const cookieStore = await cookies();
    return cookieStore.get(COOKIE_NAMES.ACCESS)?.value ?? null;
}

export async function requireUserAuthFromContext(): Promise<Authed | NextResponse> {
    const token = await getAccessTokenStringFromContext();
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const payload = await verifyAccessToken(token);
        return { payload, token };
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export type Authed = { payload: AuthTokenPayload; token: string };

/**
 * Return `Authed` or a 401/403 `NextResponse`. Never log the token.
 */
export async function requireUserAuth(
    req: Request | NextRequest
): Promise<Authed | NextResponse> {
    const token = getAccessTokenStringFromRequest(req);
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const payload = await verifyAccessToken(token);
        return { payload, token };
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

const ROLE_LEVEL: Record<string, number> = {
    owner: 4,
    manager: 3,
    cashier: 2,
};

/** Owner always passes; else needs `atLeast` role level. */
export function hasMinRole(
    payload: AuthTokenPayload,
    atLeast: "owner" | "manager" | "cashier"
): boolean {
    if (payload.role === "owner") return true;
    return (ROLE_LEVEL[payload.role] ?? 0) >= (ROLE_LEVEL[atLeast] ?? 0);
}

export function isOwner(payload: AuthTokenPayload): boolean {
    return payload.role === "owner";
}

/** At least one permission key, or owner. */
export function hasAnyPermission(
    payload: AuthTokenPayload,
    keys: string[]
): boolean {
    if (payload.role === "owner") return true;
    const p = new Set(payload.perms ?? []);
    return keys.some((k) => p.has(k));
}

/**
 * 403 if not owner and missing every permission. Owner bypasses.
 */
export function requireOwnerOrPerms(
    payload: AuthTokenPayload,
    perms: string[]
): NextResponse | true {
    if (payload.role === "owner") return true;
    if (perms.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (hasAnyPermission(payload, perms)) return true;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/** Owner-only action. */
export function requireOwner(payload: AuthTokenPayload): NextResponse | true {
    if (payload.role === "owner") return true;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
