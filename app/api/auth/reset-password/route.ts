import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPassword, AuthError } from "@/server/auth/auth-service";
import { createPasswordSchema } from "@/lib/password-requirements";

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    newPassword: createPasswordSchema(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = resetPasswordSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input. Please provide a valid token and password." },
                { status: 400 }
            );
        }

        await resetPassword({
            token: parsed.data.token,
            newPasswordPlain: parsed.data.newPassword,
        });

        return NextResponse.json(
            { message: "Password has been successfully reset." },
            { status: 200 }
        );
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json(
                { error: error.message },
                { status: 400 }
            );
        }

        console.error("[POST /api/auth/reset-password] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
