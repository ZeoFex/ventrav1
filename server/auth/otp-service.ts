/**
 * OTP generation and verification.
 * Raw code displayed to user / sent via email.
 * SHA-256 hash stored in DB — never store raw codes.
 */
import { createHash, randomInt } from "crypto";
import { OTP_LENGTH } from "../config/auth-config";

/**
 * Generate a cryptographically random N-digit OTP code.
 * Returns { code, codeHash } — code for email, codeHash for DB.
 */
export function generateOtp(): { code: string; codeHash: string } {
    const min = Math.pow(10, OTP_LENGTH - 1); // 100000
    const max = Math.pow(10, OTP_LENGTH);      // 1000000
    const code = randomInt(min, max).toString();
    const codeHash = sha256(code);
    return { code, codeHash };
}

/**
 * Verify a user-supplied OTP code against a stored hash.
 */
export function verifyOtp(code: string, storedHash: string): boolean {
    return sha256(code) === storedHash;
}

/** SHA-256 hex digest */
function sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
}
