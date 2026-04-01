import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/server/auth/auth-service";

const forgotPasswordSchema = z.object({
    email: z.string().trim().email(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = forgotPasswordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Generate base URL for the email link (e.g., https://yourdomain.com)
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host") || "localhost:3000";
        const baseUrl = `${protocol}://${host}`;

        // Triggers the email securely, won't throw if user doesn't exist
        await requestPasswordReset(parsed.data.email, baseUrl);

        return NextResponse.json(
            { message: "If the email is registered, a reset link was sent." },
            { status: 200 }
        );
    } catch (error) {
        console.error("[POST /api/auth/forgot-password] Error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
