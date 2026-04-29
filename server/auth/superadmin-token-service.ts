/**
 * Superadmin-only JWT (separate secret + issuer + audience vs tenant access tokens).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { nanoid } from "nanoid";
import { env } from "../config/env";
import {
    SUPERADMIN_ACCESS_TOKEN_TTL,
    SUPERADMIN_JWT_AUDIENCE,
    SUPERADMIN_JWT_ISSUER,
} from "../config/auth-config";

export interface SuperadminTokenPayload extends JWTPayload {
    sub: string;
    email: string;
    name: string;
    jti: string;
}

function getSecret(): Uint8Array | null {
    const s = env.SUPERADMIN_JWT_SECRET?.trim();
    if (!s || s.length < 32) {
        return null;
    }
    return new TextEncoder().encode(s);
}

export function isSuperadminJwtConfigured(): boolean {
    return getSecret() !== null;
}

export async function signSuperadminAccessToken(payload: {
    superadminId: string;
    email: string;
    firstName: string;
}): Promise<string> {
    const secret = getSecret();
    if (!secret) {
        throw new Error("SUPERADMIN_JWT_SECRET is not configured");
    }
    const jti = nanoid(21);
    return new SignJWT({
        sub: payload.superadminId,
        email: payload.email,
        name: payload.firstName,
        jti,
    } satisfies Partial<SuperadminTokenPayload>)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${SUPERADMIN_ACCESS_TOKEN_TTL}s`)
        .setIssuer(SUPERADMIN_JWT_ISSUER)
        .setAudience(SUPERADMIN_JWT_AUDIENCE)
        .sign(secret);
}

export async function verifySuperadminAccessToken(
    token: string
): Promise<SuperadminTokenPayload> {
    const secret = getSecret();
    if (!secret) {
        throw new Error("SUPERADMIN_JWT_SECRET is not configured");
    }
    const { payload } = await jwtVerify(token, secret, {
        issuer: SUPERADMIN_JWT_ISSUER,
        audience: SUPERADMIN_JWT_AUDIENCE,
    });
    return payload as SuperadminTokenPayload;
}
