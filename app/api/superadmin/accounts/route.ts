import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/server/auth/auth-service";
import { requireValidPlatformKeyOnly } from "@/server/auth/api-request-auth";
import { createSuperadmin } from "@/server/auth/superadmin-service";

export const dynamic = "force-dynamic";

const createSchema = z
    .object({
        email: z.string().trim().email(),
        password: z.string().min(12, "Password must be at least 12 characters"),
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().optional(),
    })
    .strict();

/**
 * Provision a human superadmin. Requires `VENTRA_PLATFORM_API_KEYS` (`X-Ventra-Platform-Key`).
 */
export async function POST(req: NextRequest) {
    const gate = requireValidPlatformKeyOnly(req);
    if (gate !== true) {
        return gate;
    }

    let body: unknown;
    try {
        const raw = await req.text();
        if (!raw.trim()) {
            return NextResponse.json(
                {
                    error:
                        "Missing JSON body. Send application/json with email, password (≥12 characters), firstName, and optional lastName.",
                },
                { status: 400 }
            );
        }
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    try {
        const created = await createSuperadmin({
            email: parsed.data.email,
            passwordPlain: parsed.data.password,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            createdByLabel: "platform_api_key",
            ipAddress: ip,
            userAgent,
        });
        return NextResponse.json(
            {
                id: created.id,
                email: created.email,
            },
            { status: 201 }
        );
    } catch (e) {
        if (e instanceof AuthError) {
            const conflict = e.code === "DUPLICATE_EMAIL" || e.code === "EMAIL_IN_USE";
            return NextResponse.json(
                { error: e.message, code: e.code },
                { status: conflict ? 409 : 400 }
            );
        }
        console.error("[POST /api/superadmin/accounts]", e);
        return NextResponse.json({ error: "Failed to create superadmin" }, { status: 500 });
    }
}
