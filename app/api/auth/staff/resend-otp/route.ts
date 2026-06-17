import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resendStaffLoginOtp } from "@/server/auth/staff-auth-service";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

const resendSchema = z.object({
    phone: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = resendSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ message: "If eligible, a new code was sent." });
        }

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";
        const rate = await rateLimitKey(
            `auth:staff-resend:${ip}`,
            env.RATE_LIMIT_LOGIN_PER_IP,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many requests. Please try again later." },
                { status: 429 }
            );
        }

        const result = await resendStaffLoginOtp(parsed.data.phone);
        const isDev = process.env.NODE_ENV === "development";

        return NextResponse.json({
            message: "If eligible, a new code was sent.",
            ...(isDev && result.otpCode ? { _devOtp: result.otpCode } : {}),
        });
    } catch (error) {
        console.error("[POST /api/auth/staff/resend-otp] Unexpected error:", error);
        return NextResponse.json({ message: "If eligible, a new code was sent." });
    }
}
