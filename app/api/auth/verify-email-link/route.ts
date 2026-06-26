/**
 * POST /api/auth/verify-email-link
 *
 * Verifies email via one-click link token from signup email.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailByToken, AuthError } from "@/server/auth/auth-service";
import { signAccessToken } from "@/server/auth/token-service";
import {
    ACCESS_TOKEN_TTL,
    COOKIE_NAMES,
} from "@/server/config/auth-config";

const verifyLinkSchema = z.object({
    token: z.string().trim().min(1, "Verification token is required"),
});

async function issueVerifiedResponse(result: Awaited<ReturnType<typeof verifyEmailByToken>>) {
    const accessToken = await signAccessToken({
        userId: result.userId,
        firstName: result.firstName,
        email: result.email,
        businessId: result.businessId,
        role: result.role,
        permissions: result.permissions,
        plan: result.plan,
    });

    const response = NextResponse.json(
        {
            message: "Email verified successfully",
            user: {
                id: result.userId,
                businessId: result.businessId,
                firstName: result.firstName,
                email: result.email,
                role: result.role,
                plan: result.plan,
                onboardingCompleted: result.onboardingCompleted,
            },
        },
        { status: 200 },
    );

    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set(COOKIE_NAMES.ACCESS, accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: ACCESS_TOKEN_TTL,
    });

    return response;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = verifyLinkSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid verification link" },
                { status: 400 },
            );
        }

        const result = await verifyEmailByToken(parsed.data.token);
        return await issueVerifiedResponse(result);
    } catch (error) {
        if (error instanceof AuthError) {
            const statusMap: Record<string, number> = {
                INVALID_OTP: 400,
                ALREADY_VERIFIED: 409,
            };
            const status = statusMap[error.code] || 400;

            return NextResponse.json(
                { error: error.message, code: error.code },
                { status },
            );
        }

        console.error("[verify-email-link] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
        );
    }
}
