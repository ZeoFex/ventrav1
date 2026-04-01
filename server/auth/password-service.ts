/**
 * Password hashing and verification using Argon2id.
 * Argon2id is memory-hard and side-channel resistant — the gold standard.
 */
import { hash, verify } from "@node-rs/argon2";
import { ARGON2_OPTIONS } from "../config/auth-config";

/**
 * Hash a plaintext password with Argon2id.
 * Returns the full encoded hash string (includes salt + params).
 * Takes ~200ms — fast enough for UX, hard enough against GPU attacks.
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against an Argon2id hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(
    hash: string,
    password: string
): Promise<boolean> {
    try {
        return await verify(hash, password);
    } catch {
        // If the hash format is invalid, return false
        return false;
    }
}
