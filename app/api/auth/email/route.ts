import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { changeAccountEmail } from "@/server/auth/account-credentials";
import { signAccessToken } from "@/server/auth/token-service";
import { ACCESS_TOKEN_TTL, COOKIE_NAMES } from "@/server/config/auth-config";

const bodySchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(320),
  currentPassword: z.string().min(1, "Enter your current password"),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Enter a valid email address.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await changeAccountEmail(
      auth.payload.sub,
      parsed.data.email,
      parsed.data.currentPassword,
    );

    if (!result.ok) {
      const messages: Record<typeof result.reason, { error: string; status: number }> = {
        WRONG_PASSWORD: { error: "Current password is incorrect.", status: 401 },
        EMAIL_TAKEN: { error: "That email is already in use.", status: 409 },
        SAME_EMAIL: { error: "That is already your sign-in email.", status: 400 },
        INVALID_EMAIL: { error: "Enter a valid email address.", status: 400 },
        NOT_FOUND: { error: "Account not found.", status: 404 },
      };
      const mapped = messages[result.reason];
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }

    const { payload } = auth;
    const accessToken = await signAccessToken({
      userId: payload.sub,
      firstName: payload.name,
      email: result.email,
      businessId: payload.bid,
      role: payload.role,
      branchId: payload.brn,
      avatarUrl: payload.img,
      permissions: payload.perms ?? [],
      plan: payload.plan,
    });

    const response = NextResponse.json({
      message: "Email updated.",
      email: result.email,
    });
    response.cookies.set(COOKIE_NAMES.ACCESS, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_TTL,
    });
    return response;
  } catch (error) {
    console.error("[POST /api/auth/email]", error);
    return NextResponse.json({ error: "Could not update email." }, { status: 500 });
  }
}
