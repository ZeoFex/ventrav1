import { cookies, headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type AuthTokenPayload } from "./token-service";
import { ACT_AS_BUSINESS_HEADER, COOKIE_NAMES, PLATFORM_KEY_HEADER } from "../config/auth-config";
import { buildPlatformActAsPayload, isValidPlatformKey } from "./platform-key";
import { verifySuperadminAccessToken } from "./superadmin-token-service";
import { getSuperadminById } from "./superadmin-service";

/** `Authorization: Bearer` token string, or null. Malformed `Bearer` (no token) yields null. */
export function parseAuthorizationBearer(value: string | null): string | null {
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

function getPlatformKeyFromWebHeaders(h: { get: (n: string) => string | null }): string | null {
    return h.get(PLATFORM_KEY_HEADER) ?? h.get(PLATFORM_KEY_HEADER.toLowerCase());
}

function getActAsBusinessIdFromWebHeaders(h: { get: (n: string) => string | null }): string | null {
    return h.get(ACT_AS_BUSINESS_HEADER) ?? h.get(ACT_AS_BUSINESS_HEADER.toLowerCase());
}

async function tryPlatformOrJwt(
    h: { get: (n: string) => string | null },
    getToken: () => Promise<string | null>
): Promise<Authed | NextResponse> {
    const pk = getPlatformKeyFromWebHeaders(h);
    if (pk) {
        if (!isValidPlatformKey(pk)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const actAs = getActAsBusinessIdFromWebHeaders(h)?.trim() ?? "";
        if (!actAs) {
            return NextResponse.json(
                {
                    error:
                        "X-Act-As-Business-Id is required when using a platform key on tenant routes (e.g. /api/branches). Send a business UUID to impersonate that tenant, or use GET /api/platform/* for cross-tenant lists (e.g. GET /api/platform/branches) with the platform key only.",
                },
                { status: 400 }
            );
        }
        const payload = await buildPlatformActAsPayload(actAs);
        if (!payload) {
            return NextResponse.json(
                { error: "Unknown business or no users in business" },
                { status: 404 }
            );
        }
        return { payload, token: "platform" };
    }
    const token = await getToken();
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

export async function requireUserAuthFromContext(): Promise<Authed | NextResponse> {
    const h = await headers();
    return tryPlatformOrJwt(h, () => getAccessTokenStringFromContext());
}

export type Authed = { payload: AuthTokenPayload; token: string };

/**
 * Return `Authed` or a 401/403 `NextResponse`. Never log the token.
 */
export async function requireUserAuth(
    req: Request | NextRequest
): Promise<Authed | NextResponse> {
    return tryPlatformOrJwt(req.headers, async () =>
        Promise.resolve(getAccessTokenStringFromRequest(req))
    );
}

/**
 * Platform routes: valid `X-Ventra-Platform-Key` **or** valid superadmin Bearer JWT (active account).
 * If the platform key header is non-empty and invalid, returns 401 (does not fall back to Bearer).
 */
export async function requirePlatformAccess(
    req: Request | NextRequest
): Promise<true | NextResponse> {
    const pk = getPlatformKeyFromWebHeaders(req.headers);
    if (pk) {
        if (!isValidPlatformKey(pk)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return true;
    }
    const bearer = parseAuthorizationBearer(req.headers.get("authorization"));
    if (!bearer) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const payload = await verifySuperadminAccessToken(bearer);
        const row = await getSuperadminById(payload.sub);
        if (!row || row.status !== "active") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return true;
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

/**
 * Platform-only: valid `X-Ventra-Platform-Key` (e.g. `GET /api/platform/businesses`).
 * Does not use act-as or user JWT.
 */
export function requireValidPlatformKeyOnly(req: Request | NextRequest): true | NextResponse {
    const pk = getPlatformKeyFromWebHeaders(req.headers);
    if (!pk || !isValidPlatformKey(pk)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return true;
}

const ROLE_LEVEL: Record<string, number> = {
    owner: 4,
    manager: 3,
    cashier: 2,
};

/** Owner always passes; else needs `atLeast` role level. Custom roles with permissions count as cashier. */
export function hasMinRole(
    payload: AuthTokenPayload,
    atLeast: "owner" | "manager" | "cashier"
): boolean {
    if (payload.role === "owner") return true;
    const normalized = payload.role.toLowerCase();
    let level =
        ROLE_LEVEL[payload.role] ??
        ROLE_LEVEL[normalized] ??
        0;
    if (level === 0 && (payload.perms?.length ?? 0) > 0) {
        level = ROLE_LEVEL.cashier;
    }
    return level >= (ROLE_LEVEL[atLeast] ?? 0);
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

export type ResolvedSuperadmin = {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
};

/** Active superadmin from Bearer JWT, or null. */
export async function resolveActiveSuperadminFromRequest(
    req: Request | NextRequest
): Promise<ResolvedSuperadmin | null> {
    const bearer = parseAuthorizationBearer(req.headers.get("authorization"));
    if (!bearer) return null;
    try {
        const payload = await verifySuperadminAccessToken(bearer);
        const row = await getSuperadminById(payload.sub);
        if (!row || row.status !== "active") return null;
        return {
            id: row.id,
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
        };
    } catch {
        return null;
    }
}
