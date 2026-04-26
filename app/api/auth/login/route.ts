import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, AuthError } from "@/server/auth/auth-service";
import { signAccessToken } from "@/server/auth/token-service";
import { ACCESS_TOKEN_TTL, COOKIE_NAMES } from "@/server/config/auth-config";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1, "Password is required"),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 400 }
            );
        }

        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
        const rate = await rateLimitKey(
            `auth:login:${ip}`,
            env.RATE_LIMIT_LOGIN_PER_IP,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many sign-in attempts. Please try again later." },
                { status: 429 }
            );
        }

        const userAgent = req.headers.get("user-agent") || "Unknown";
        // Attempt to get IP from standard proxy headers, fallback to Unknown
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";

        const result = await login({
            email: parsed.data.email,
            passwordPlain: parsed.data.password,
            userAgent,
            ipAddress,
        });

        // Generate JWT Access Token
        const accessToken = await signAccessToken({
            userId: result.userId,
            firstName: result.firstName,
            email: result.email || parsed.data.email, // Use email from result or parsed body
            businessId: result.businessId,
            role: result.role,
            branchId: result.branchId,
            permissions: result.permissions,
            plan: result.plan,
        });

        const isProduction = process.env.NODE_ENV === "production";

        const bodyJson: {
            message: string;
            user: {
                id: string;
                businessId: string;
                firstName: string;
                role: string;
                branchId: string | null | undefined;
                plan: string;
                onboardingCompleted: boolean;
            };
            accessToken?: string;
        } = {
            message: "Logged in successfully",
            user: {
                id: result.userId,
                businessId: result.businessId,
                firstName: result.firstName,
                role: result.role,
                branchId: result.branchId,
                plan: result.plan,
                onboardingCompleted: result.onboardingCompleted,
            },
        };
        if (env.INCLUDE_ACCESS_TOKEN_IN_LOGIN === "true") {
            bodyJson.accessToken = accessToken;
        }
        const response = NextResponse.json(bodyJson, { status: 200 });

        // Set HttpOnly Cookie for access token
        response.cookies.set(COOKIE_NAMES.ACCESS, accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            path: "/",
            maxAge: ACCESS_TOKEN_TTL,
        });

        // If user is locked to a branch, set the branch cookie
        if (result.branchId) {
            response.cookies.set(COOKIE_NAMES.BRANCH, result.branchId, {
                httpOnly: false, // Accessible by client-side branch context
                secure: isProduction,
                sameSite: "lax",
                path: "/",
                maxAge: ACCESS_TOKEN_TTL,
            });
        }

        return response;
    } catch (error) {
        if (error instanceof AuthError) {
            const statusMap: Record<string, number> = {
                INVALID_CREDENTIALS: 401,
                ACCOUNT_SUSPENDED: 403,
                ACCOUNT_NOT_VERIFIED: 403,
            };
            const status = statusMap[error.code] || 400;

            return NextResponse.json(
                { error: error.message, code: error.code },
                { status }
            );
        }

        console.error("[POST /api/auth/login] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
