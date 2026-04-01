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

    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

    // Cookie
    COOKIE_DOMAIN: z.string().optional().default("localhost"),

    // App
    NEXT_PUBLIC_APP_URL: z
        .string()
        .optional()
        .default("http://localhost:3000"),
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
