/**
 * Environment variable validation.
 * Fails fast at startup if critical vars are missing.
 */
import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    // Redis (Upstash – already in .env.local)
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),

    // Auth secrets
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters"),

    /**
     * HS256 secret for platform superadmin human JWTs (isolated from tenant `JWT_SECRET`).
     * Empty = signing/verification disabled (Bearer superadmin off; platform key still works).
     */
    SUPERADMIN_JWT_SECRET: z
        .string()
        .optional()
        .default("")
        .refine(
            (s) => !s || s.length >= 32,
            "SUPERADMIN_JWT_SECRET must be empty or at least 32 characters",
        ),

    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

    // SMS (optional — only required if SMS OTP is enabled)
    AGOO_API_KEY: z.string().optional().default(""),
    /** Approved AgooSMS sender ID (3–11 alphanumeric). Omit to use provider default (“AgooSMS”). */
    AGOO_SENDER_ID: z
        .string()
        .optional()
        .default("")
        .transform((s) => s.trim())
        .refine(
            (s) => !s || /^[a-zA-Z0-9]{3,11}$/.test(s),
            "AGOO_SENDER_ID must be empty or 3–11 alphanumeric characters",
        ),

    // Cookie
    COOKIE_DOMAIN: z.string().optional().default("localhost"),

    // App
    NEXT_PUBLIC_APP_URL: z
        .string()
        .optional()
        .default("http://localhost:3000"),

    /**
     * Comma-separated CORS allowlist (e.g. `https://admin.ventrapos.com`).
     * Empty = no CORS for cross-origin (same-origin and server-to-server work as before).
     */
    ADMIN_DASHBOARD_ORIGINS: z.string().optional().default(""),

    /** Return JWT in `POST /api/auth/login` JSON (for Bearer from separate origins). */
    INCLUDE_ACCESS_TOKEN_IN_LOGIN: z
        .enum(["true", "false"])
        .optional()
        .default("true"),

    /** Vercel Cron and manual triggers */
    CRON_SECRET: z.string().optional().default(""),

    /** Login attempts per IP per 15 min window (public auth hardening) */
    RATE_LIMIT_LOGIN_PER_IP: z.coerce.number().int().min(1).optional().default(30),

    /** `POST /api/superadmin/auth/login` attempts per IP (same window as auth email window) */
    RATE_LIMIT_SUPERADMIN_LOGIN_PER_IP: z.coerce
        .number()
        .int()
        .min(1)
        .optional()
        .default(20),
    RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC: z.coerce
        .number()
        .int()
        .min(60)
        .optional()
        .default(900),

    /**
     * Comma-separated **platform (superadmin) API keys** (each ≥ 32 characters).
     * Used with `X-Ventra-Platform-Key` + `X-Act-As-Business-Id` for tenant API access,
     * or with only the key for `/api/platform/*`. Empty = feature disabled.
     */
    VENTRA_PLATFORM_API_KEYS: z.string().optional().default(""),

    /**
     * Extra CORS allowlist for the superadmin dashboard (merged with `ADMIN_DASHBOARD_ORIGINS`).
     */
    SUPERADMIN_DASHBOARD_ORIGINS: z.string().optional().default(""),

    NODE_ENV: z
        .enum(["development", "production", "test"])
        .optional()
        .default("development"),
});

function loadEnv() {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error(
            "❌ Invalid environment variables:",
            parsed.error.flatten().fieldErrors
        );
        throw new Error("Missing or invalid environment variables");
    }
    return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
