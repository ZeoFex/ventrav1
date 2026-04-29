/**
 * Auth configuration constants.
 * Central place for all auth-related tunables.
 */

/** Access token (JWT) lifetime in seconds — 7 days */
export const ACCESS_TOKEN_TTL = 7 * 24 * 60 * 60;

/** Superadmin human JWT — shorter window than tenant tokens (seconds). Default 4 hours */
export const SUPERADMIN_ACCESS_TOKEN_TTL = 4 * 60 * 60;

/** HS256 issuer for superadmin-only tokens (tenant tokens use `ventrapos`). */
export const SUPERADMIN_JWT_ISSUER = "ventrapos-superadmin" as const;

/** Audience claim for superadmin tokens; tenant `verifyAccessToken` rejects this. */
export const SUPERADMIN_JWT_AUDIENCE = "ventrapos:superadmin" as const;

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

/** Optional branch for API clients (CORS + Bearer), takes precedence over branch cookie. */
export const BRANCH_ID_HEADER = "X-Branch-Id";

/** Superadmin: high-entropy key from `VENTRA_PLATFORM_API_KEYS` (use header, not Bearer JWT). */
export const PLATFORM_KEY_HEADER = "X-Ventra-Platform-Key";

/** With platform key, required for tenant-scoped routes: target business id. */
export const ACT_AS_BUSINESS_HEADER = "X-Act-As-Business-Id";
