import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/server/auth/auth-service";
import { resolveActiveSuperadminFromRequest } from "@/server/auth/api-request-auth";
import { getSuperadminById, updateSuperadminSelf } from "@/server/auth/superadmin-service";

export const dynamic = "force-dynamic";

const patchSchema = z
    .object({
        currentPassword: z.string().min(1),
        email: z.string().trim().email().optional(),
        newPassword: z.string().min(12).optional(),
        firstName: z.string().trim().min(1).optional(),
        lastName: z.string().trim().optional(),
    })
    .strict()
    .refine(
        (o) =>
            o.email !== undefined ||
            o.newPassword !== undefined ||
            o.firstName !== undefined ||
            o.lastName !== undefined,
        { message: "At least one field to update is required" }
    );

/** Current signed-in superadmin profile. */
export async function GET(req: NextRequest) {
    const actor = await resolveActiveSuperadminFromRequest(req);
    if (!actor) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const row = await getSuperadminById(actor.id);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        status: row.status,
    });
}

/** Update signed-in superadmin email, password, or name. */
export async function PATCH(req: NextRequest) {
    const actor = await resolveActiveSuperadminFromRequest(req);
    if (!actor) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    try {
        const updated = await updateSuperadminSelf({
            superadminId: actor.id,
            currentPassword: parsed.data.currentPassword,
            email: parsed.data.email,
            passwordPlain: parsed.data.newPassword,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            ipAddress: ip,
            userAgent,
        });
        return NextResponse.json({
            message: "Account updated",
            user: {
                id: actor.id,
                email: updated.email,
                firstName: updated.firstName,
                lastName: updated.lastName,
            },
        });
    } catch (e) {
        if (e instanceof AuthError) {
            const status =
                e.code === "INVALID_CREDENTIALS"
                    ? 401
                    : e.code === "DUPLICATE_EMAIL" || e.code === "EMAIL_IN_USE"
                      ? 409
                      : 400;
            return NextResponse.json({ error: e.message, code: e.code }, { status });
        }
        console.error("[PATCH /api/superadmin/me]", e);
        return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
    }
}
