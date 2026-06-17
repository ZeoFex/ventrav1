import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { initStaffLogin } from "@/server/auth/staff-auth-service";
import { AuthError } from "@/server/auth/auth-service";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

const staffLoginSchema = z.object({
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = staffLoginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid phone number or password" },
                { status: 400 }
            );
        }

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";
        const rate = await rateLimitKey(
            `auth:staff-login:${ip}`,
            env.RATE_LIMIT_LOGIN_PER_IP,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many sign-in attempts. Please try again later." },
                { status: 429 }
            );
        }

        const result = await initStaffLogin({
            phone: parsed.data.phone,
            passwordPlain: parsed.data.password,
        });

        const isDev = process.env.NODE_ENV === "development";
        const smsConfigured = Boolean(env.AGOO_API_KEY);

        return NextResponse.json(
            {
                message: smsConfigured
                    ? "Verification code sent to your phone"
                    : "Verification code generated",
                requiresOtp: true,
                phone: result.phone,
                smsSent: smsConfigured,
                ...(result.otpCode && isDev ? { _devOtp: result.otpCode } : {}),
            },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof AuthError) {
            const statusMap: Record<string, number> = {
                INVALID_CREDENTIALS: 401,
                ACCOUNT_SUSPENDED: 403,
                ACCOUNT_NOT_VERIFIED: 403,
                AMBIGUOUS_PHONE: 409,
            };
            const status = statusMap[error.code] || 400;

            return NextResponse.json(
                { error: error.message, code: error.code },
                { status }
            );
        }

        console.error("[POST /api/auth/staff/login] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
