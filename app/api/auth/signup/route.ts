/**
 * POST /api/auth/signup
 *
 * Creates a new user account + business tenant.
 * Returns 201 on success with a message to verify email.
 * In development, returns the OTP code for testing convenience.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signup, AuthError } from "@/server/auth/auth-service";

const signupSchema = z.object({
    businessName: z
        .string()
        .trim()
        .min(2, "Business name must be at least 2 characters")
        .max(255),
    fullName: z
        .string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(200),
    email: z
        .string()
        .trim()
        .email("Please enter a valid email address")
        .max(320),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128)
        .regex(/[A-Z]/, "Password must contain an uppercase letter")
        .regex(/[a-z]/, "Password must contain a lowercase letter")
        .regex(/\d/, "Password must contain a number")
        .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export async function POST(request: NextRequest) {
    try {
        // 1. Parse and validate body
        const body = await request.json();
        const parsed = signupSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Validation failed",
                    details: parsed.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        // 2. Call signup service
        const result = await signup(parsed.data);

        // 3. In development, return OTP for testing.
        //    In production, OTP is only sent via email (BullMQ job).
        const isDev = process.env.NODE_ENV === "development";

        return NextResponse.json(
            {
                message: "Account created. Please check your email for a verification code.",
                email: result.email,
                ...(isDev ? { _devOtp: result.otpCode } : {}),
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof AuthError) {
            // Map auth errors to appropriate HTTP status codes
            const statusMap: Record<string, number> = {
                DUPLICATE_EMAIL: 409,
                RATE_LIMITED: 429,
            };
            const status = statusMap[error.code] || 400;

            return NextResponse.json(
                { error: error.message, code: error.code },
                { status }
            );
        }

        // Unexpected error — log but don't leak internals
        console.error("[signup] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
