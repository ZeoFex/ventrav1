/**
 * POST /api/auth/resend-otp
 *
 * Resends a new 6-digit verification code.
 * Always returns success to prevent email enumeration.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resendOtp } from "@/server/auth/auth-service";

const resendSchema = z.object({
    email: z.string().trim().email().max(320),
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

        const result = await resendOtp(parsed.data.email);

        // Always return success — enumeration protection
        const isDev = process.env.NODE_ENV === "development";

        return NextResponse.json({
            message:
                "If an account exists and needs verification, a new code has been sent.",
            ...(isDev && result ? { _devOtp: result.otpCode } : {}),
        });
    } catch (error) {
        console.error("[resend-otp] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
