/**
 * POST /api/auth/signup
 *
 * Creates a new user account + business tenant.
 * Returns 201 on success with a message to verify email.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signup, AuthError } from "@/server/auth/auth-service";
import { isValidPlanId } from "@/config/plans";
import { createPasswordSchema } from "@/lib/password-requirements";

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
    phone: z.string().trim().max(30).optional(),
    password: createPasswordSchema(),
    plan: z.string().refine(isValidPlanId, "Please select a valid plan"),
    referralCode: z.string().trim().max(32).optional(),
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

        return NextResponse.json(
            {
                message: "Account created. Please check your email for a verification code.",
                email: result.email,
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
