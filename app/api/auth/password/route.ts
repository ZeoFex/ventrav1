import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { changeAccountPassword } from "@/server/auth/account-credentials";
import { createPasswordSchema } from "@/lib/password-requirements";

const bodySchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: createPasswordSchema(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Check the password and try again.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const result = await changeAccountPassword(
      auth.payload.sub,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );

    if (!result.ok) {
      if (result.reason === "WRONG_PASSWORD") {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 },
        );
      }
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Password updated." });
  } catch (error) {
    console.error("[POST /api/auth/password]", error);
    return NextResponse.json({ error: "Could not update password." }, { status: 500 });
  }
}
