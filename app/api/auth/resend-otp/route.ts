/**
 * POST /api/auth/resend-otp
 *
 * Resends a new 6-digit verification code.
 * Always returns success to prevent email enumeration.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resendOtp } from "@/server/auth/auth-service";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

const resendSchema = z.object({
    email: z.string().trim().email().max(320),
    channel: z.enum(["email", "sms"]).optional().default("email"),
    phone: z.string().trim().max(20).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = resendSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Please enter a valid email address" },
                { status: 400 }
            );
        }

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
        const rl = await rateLimitKey(
            `auth:resend-otp:${ip}:${parsed.data.email}`,
            8,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rl.ok) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }

        const { email, channel, phone } = parsed.data;
        await resendOtp(email, channel, phone);

        return NextResponse.json({
            message:
                "If an account exists and needs verification, a new code has been sent.",
        });
    } catch (error) {
        console.error("[resend-otp] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
