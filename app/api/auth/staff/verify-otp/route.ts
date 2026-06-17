import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyStaffLogin } from "@/server/auth/staff-auth-service";
import { AuthError } from "@/server/auth/auth-service";
import { createAuthenticatedLoginResponse } from "@/server/auth/login-response";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

const verifySchema = z.object({
    phone: z.string().min(1),
    code: z.string().length(6, "Enter the 6-digit code"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = verifySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid verification code" },
                { status: 400 }
            );
        }

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";
        const rate = await rateLimitKey(
            `auth:staff-verify:${ip}`,
            env.RATE_LIMIT_LOGIN_PER_IP,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }

        const userAgent = req.headers.get("user-agent") || "Unknown";
        const ipAddress =
            req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") ||
            "Unknown";

        const result = await verifyStaffLogin({
            phone: parsed.data.phone,
            code: parsed.data.code,
            userAgent,
            ipAddress,
        });

        return createAuthenticatedLoginResponse(result);
    } catch (error) {
        if (error instanceof AuthError) {
            const statusMap: Record<string, number> = {
                INVALID_OTP: 400,
                OTP_EXHAUSTED: 429,
                INVALID_CREDENTIALS: 401,
                ACCOUNT_SUSPENDED: 403,
            };
            const status = statusMap[error.code] || 400;

            return NextResponse.json(
                { error: error.message, code: error.code },
                { status }
            );
        }

        console.error("[POST /api/auth/staff/verify-otp] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
