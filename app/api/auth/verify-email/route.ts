/**
 * POST /api/auth/verify-email
 *
 * Verifies the 6-digit OTP code sent during signup.
 * On success, activates the account, issues JWT + refresh token cookies,
 * and returns the user context for the frontend.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmail, AuthError } from "@/server/auth/auth-service";
import { signAccessToken } from "@/server/auth/token-service";
import {
    ACCESS_TOKEN_TTL,
    COOKIE_NAMES,
} from "@/server/config/auth-config";

const verifySchema = z.object({
    email: z.string().trim().email().max(320),
    code: z
        .string()
        .trim()
        .length(6, "Verification code must be 6 digits")
        .regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export async function POST(request: NextRequest) {
    try {
        // 1. Parse and validate
        const body = await request.json();
        const parsed = verifySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        // 2. Verify OTP
        const result = await verifyEmail(parsed.data);

        // 3. Issue access token (JWT)
        const accessToken = await signAccessToken({
            userId: result.userId,
            firstName: result.firstName,
            email: result.email,
            businessId: result.businessId,
            role: result.role,
            permissions: result.permissions,
            plan: result.plan,
        });

        // 4. Build response
        const response = NextResponse.json(
            {
                message: "Email verified successfully",
                user: {
                    id: result.userId,
                    businessId: result.businessId,
                    firstName: result.firstName,
                    role: result.role,
                    plan: result.plan,
                    onboardingCompleted: result.onboardingCompleted,
                },
            },
            { status: 200 }
        );

        // 5. Set access token cookie
        const isProduction = process.env.NODE_ENV === "production";

        response.cookies.set(COOKIE_NAMES.ACCESS, accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_TTL,
        });

        // Note: Full refresh token flow is added with the login route.
        // For now after signup verification, we issue an access token
        // that gets the user through onboarding (~15 min window).

        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            const statusMap: Record<string, number> = {
                INVALID_OTP: 400,
                OTP_EXHAUSTED: 429,
                ALREADY_VERIFIED: 409,
            };
            const status = statusMap[error.code] || 400;

            return NextResponse.json(
                { error: error.message, code: error.code },
                { status }
            );
        }

        console.error("[verify-email] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
