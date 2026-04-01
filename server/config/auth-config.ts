/**
 * Auth configuration constants.
 * Central place for all auth-related tunables.
 */

/** Access token (JWT) lifetime in seconds — 7 days */
export const ACCESS_TOKEN_TTL = 7 * 24 * 60 * 60;

/** Refresh token lifetime in seconds — 7 days */
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/** Session lifetime (matches refresh token) */
export const SESSION_TTL = REFRESH_TOKEN_TTL;

/** OTP code length */
export const OTP_LENGTH = 6;

/** OTP validity in seconds — 10 minutes */
export const OTP_TTL = 10 * 60;

/** Max OTP verification attempts before lockout */
export const OTP_MAX_ATTEMPTS = 5;

/** Password reset token validity in seconds — 15 minutes */
export const RESET_TOKEN_TTL = 15 * 60;

/** Argon2id cost parameters — tuned for ~200ms on typical server */
export const ARGON2_OPTIONS = {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
} as const;

/** Cookie names */
export const COOKIE_NAMES = {
    ACCESS: "__ventra_at",
    REFRESH: "__ventra_rt",
    BRANCH: "__ventra_branch",
} as const;
