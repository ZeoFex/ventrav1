/**
 * JWT access token creation and verification.
 * Uses 'jose' library — lightweight, edge-compatible.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { nanoid } from "nanoid";
import { ACCESS_TOKEN_TTL } from "../config/auth-config";

/** Claims embedded in the access token */
export interface AuthTokenPayload extends JWTPayload {
    /** userId */
    sub: string;
    /** user email */
    email: string;
    /** user firstName */
    name: string;
    /** businessId */
    bid: string;
    /** primary role name */
    role: string;
    /** branchId (optional, if branch-scoped) */
    brn?: string;
    /** profile image URL */
    img?: string | null;
    /** permission keys */
    perms: string[];
    /** the business plan (starter, growth, pro) */
    plan: string;
    /** unique token ID (for revocation) */
    jti: string;
}

function getSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters");
    }
    return new TextEncoder().encode(secret);
}

/**
 * Sign a new JWT access token.
 * Embeds user identity + tenant context so we skip DB lookups per request.
 */
export async function signAccessToken(payload: {
    userId: string;
    firstName: string;
    email: string;
    businessId: string;
    role: string;
    branchId?: string;
    avatarUrl?: string | null;
    permissions: string[];
    plan: string;
}): Promise<string> {
    const secret = getSecret();
    const jti = nanoid(21);

    return new SignJWT({
        sub: payload.userId,
        email: payload.email,
        name: payload.firstName,
        bid: payload.businessId,
        role: payload.role,
        brn: payload.branchId,
        img: payload.avatarUrl,
        perms: payload.permissions,
        plan: payload.plan,
        jti,
    } satisfies Partial<AuthTokenPayload>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
        .setIssuer("ventrapos")
        .sign(secret);
}

/**
 * Verify and decode a JWT access token.
 * Throws if expired, invalid signature, or wrong issuer.
 */
export async function verifyAccessToken(
    token: string
): Promise<AuthTokenPayload> {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, {
        issuer: "ventrapos",
    });
    return payload as AuthTokenPayload;
}
