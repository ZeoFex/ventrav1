import { SignJWT, jwtVerify } from "jose";

function secret(): Uint8Array {
    const s = process.env.JWT_SECRET;
    if (!s || s.length < 32) {
        throw new Error("JWT_SECRET must be at least 32 characters");
    }
    return new TextEncoder().encode(s);
}

export async function signReviewEditToken(reviewId: string): Promise<string> {
    return new SignJWT({ reviewId })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("365d")
        .setIssuer("ventrapos-review-edit")
        .sign(secret());
}

export async function verifyReviewEditToken(
    token: string,
    reviewId: string,
): Promise<boolean> {
    try {
        const { payload } = await jwtVerify(token, secret(), {
            issuer: "ventrapos-review-edit",
        });
        return payload.reviewId === reviewId;
    } catch {
        return false;
    }
}
