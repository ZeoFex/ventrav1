import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/server/auth/auth-service";
import { resolveActiveSuperadminFromRequest } from "@/server/auth/api-request-auth";
import { isValidPlatformKey } from "@/server/auth/platform-key";
import { PLATFORM_KEY_HEADER } from "@/server/config/auth-config";
import {
    deleteSuperadmin,
    getSuperadminById,
    updateSuperadminByAdmin,
} from "@/server/auth/superadmin-service";

export const dynamic = "force-dynamic";

const uuidParam = z.string().uuid();

const patchSchema = z
    .object({
        email: z.string().trim().email().optional(),
        password: z.string().min(12).optional(),
        firstName: z.string().trim().min(1).optional(),
        lastName: z.string().trim().optional(),
        status: z.enum(["active", "suspended"]).optional(),
    })
    .strict()
    .refine((o) => Object.values(o).some((v) => v !== undefined), {
        message: "At least one field required",
    });

function requestMeta(req: NextRequest) {
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";
    return { ipAddress: ip, userAgent };
}

type ManagerAuthResult =
    | { ok: true; mode: "platform_key" }
    | { ok: true; mode: "superadmin"; superadminId: string }
    | NextResponse;

async function authorizeManager(req: NextRequest): Promise<ManagerAuthResult> {
    const pk =
        req.headers.get(PLATFORM_KEY_HEADER) ??
        req.headers.get(PLATFORM_KEY_HEADER.toLowerCase());
    if (pk) {
        if (!isValidPlatformKey(pk)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return {
            ok: true as const,
            mode: "platform_key" as const,
        };
    }

    const superadmin = await resolveActiveSuperadminFromRequest(req);
    if (!superadmin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return {
        ok: true as const,
        mode: "superadmin" as const,
        superadminId: superadmin.id,
    };
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authorizeManager(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const row = await getSuperadminById(id);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(row);
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authorizeManager(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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

    const meta = requestMeta(req);

    try {
        const updated = await updateSuperadminByAdmin({
            targetId: id,
            actorSuperadminId:
                auth.mode === "superadmin" ? auth.superadminId : undefined,
            actorLabel:
                auth.mode === "platform_key" ? "platform_api_key" : "superadmin_portal",
            email: parsed.data.email,
            passwordPlain: parsed.data.password,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            status: parsed.data.status,
            ...meta,
        });
        return NextResponse.json({ item: updated });
    } catch (e) {
        if (e instanceof AuthError) {
            const status =
                e.code === "NOT_FOUND"
                    ? 404
                    : e.code === "DUPLICATE_EMAIL" || e.code === "EMAIL_IN_USE"
                      ? 409
                      : 400;
            return NextResponse.json({ error: e.message, code: e.code }, { status });
        }
        console.error("[PATCH /api/superadmin/accounts/[id]]", e);
        return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await authorizeManager(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const meta = requestMeta(req);

    try {
        await deleteSuperadmin({
            targetId: id,
            actorSuperadminId:
                auth.mode === "superadmin" ? auth.superadminId : undefined,
            actorLabel:
                auth.mode === "platform_key" ? "platform_api_key" : "superadmin_portal",
            ...meta,
        });
        return new NextResponse(null, { status: 204 });
    } catch (e) {
        if (e instanceof AuthError) {
            const status =
                e.code === "NOT_FOUND"
                    ? 404
                    : e.code === "CANNOT_DELETE_SELF" || e.code === "LAST_ADMIN"
                      ? 400
                      : 400;
            return NextResponse.json({ error: e.message, code: e.code }, { status });
        }
        console.error("[DELETE /api/superadmin/accounts/[id]]", e);
        return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
    }
}
