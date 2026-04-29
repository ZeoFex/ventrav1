import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/server/auth/auth-service";
import { superadminLogin } from "@/server/auth/superadmin-service";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
        }

        const ip =
            req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip") ||
            "unknown";
        const rate = await rateLimitKey(
            `auth:superadmin-login:${ip}`,
            env.RATE_LIMIT_SUPERADMIN_LOGIN_PER_IP,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many sign-in attempts. Please try again later." },
                { status: 429 }
            );
        }

        const userAgent = req.headers.get("user-agent") || "Unknown";
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";

        const result = await superadminLogin({
            email: parsed.data.email,
            passwordPlain: parsed.data.password,
            userAgent,
            ipAddress,
        });

        return NextResponse.json({
            message: "Logged in successfully",
            accessToken: result.accessToken,
            user: {
                id: result.superadminId,
                email: result.email,
                firstName: result.firstName,
                lastName: result.lastName,
            },
        });
    } catch (error) {
        if (error instanceof AuthError) {
            const statusMap: Record<string, number> = {
                INVALID_CREDENTIALS: 401,
                ACCOUNT_SUSPENDED: 403,
                SUPERADMIN_AUTH_DISABLED: 503,
            };
            const status = statusMap[error.code] ?? 400;
            return NextResponse.json({ error: error.message, code: error.code }, { status });
        }
        console.error("[POST /api/superadmin/auth/login]", error);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
}
