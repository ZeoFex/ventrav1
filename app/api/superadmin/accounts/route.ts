import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "@/server/auth/auth-service";
import {
    resolveActiveSuperadminFromRequest,
} from "@/server/auth/api-request-auth";
import { isValidPlatformKey } from "@/server/auth/platform-key";
import { PLATFORM_KEY_HEADER } from "@/server/config/auth-config";
import {
    countSuperadmins,
    createSuperadmin,
    listSuperadminsBrief,
} from "@/server/auth/superadmin-service";
import { isSuperadminJwtConfigured } from "@/server/auth/superadmin-token-service";
import { env } from "@/server/config/env";
import { rateLimitKey } from "@/server/lib/rate-limit";

export const dynamic = "force-dynamic";

const createSchema = z
    .object({
        email: z.string().trim().email(),
        password: z.string().min(12, "Password must be at least 12 characters"),
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().optional(),
    })
    .strict();

function requestMeta(req: NextRequest) {
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";
    return { ip, userAgent, ipAddress: ip };
}

async function authorizeAccountManagement(req: NextRequest): Promise<
    | {
          ok: true;
          mode: "platform_key" | "superadmin" | "bootstrap";
          superadminId?: string;
      }
    | NextResponse
> {
    const pk =
        req.headers.get(PLATFORM_KEY_HEADER) ??
        req.headers.get(PLATFORM_KEY_HEADER.toLowerCase());
    if (pk) {
        if (!isValidPlatformKey(pk)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return { ok: true, mode: "platform_key" };
    }

    const superadmin = await resolveActiveSuperadminFromRequest(req);
    if (superadmin) {
        return { ok: true, mode: "superadmin", superadminId: superadmin.id };
    }

    const total = await countSuperadmins();
    if (total === 0) {
        return { ok: true, mode: "bootstrap" };
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** List platform admin accounts (platform key or signed-in superadmin). */
export async function GET(req: NextRequest) {
    const auth = await authorizeAccountManagement(req);
    if (auth instanceof NextResponse) return auth;
    if (auth.mode === "bootstrap") {
        return NextResponse.json({ items: [] });
    }

    const items = await listSuperadminsBrief();
    return NextResponse.json({
        items: items.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
            lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
        })),
    });
}

/**
 * Create a human superadmin:
 * - Platform key (automation)
 * - Signed-in superadmin (co-admin invite)
 * - Bootstrap when no accounts exist yet (first setup)
 */
export async function POST(req: NextRequest) {
    if (!isSuperadminJwtConfigured()) {
        return NextResponse.json(
            { error: "Superadmin auth is not configured on this server" },
            { status: 503 }
        );
    }

    const auth = await authorizeAccountManagement(req);
    if (auth instanceof NextResponse) return auth;

    if (auth.mode === "bootstrap") {
        const { ip } = requestMeta(req);
        const rate = await rateLimitKey(
            `auth:superadmin-bootstrap:${ip}`,
            env.RATE_LIMIT_SUPERADMIN_LOGIN_PER_IP,
            env.RATE_LIMIT_AUTH_EMAIL_WINDOW_SEC
        );
        if (!rate.ok) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }
    }

    let body: unknown;
    try {
        const raw = await req.text();
        if (!raw.trim()) {
            return NextResponse.json(
                {
                    error:
                        "Missing JSON body. Send email, password (≥12 characters), firstName, and optional lastName.",
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
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { ipAddress, userAgent } = requestMeta(req);

    try {
        const created = await createSuperadmin({
            email: parsed.data.email,
            passwordPlain: parsed.data.password,
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            bootstrapOnly: auth.mode === "bootstrap",
            createdByLabel:
                auth.mode === "platform_key"
                    ? "platform_api_key"
                    : auth.mode === "bootstrap"
                      ? "bootstrap"
                      : "superadmin_portal",
            createdBySuperadminId:
                auth.mode === "superadmin" ? auth.superadminId : undefined,
            ipAddress,
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
            const conflict =
                e.code === "DUPLICATE_EMAIL" ||
                e.code === "EMAIL_IN_USE" ||
                e.code === "BOOTSTRAP_CLOSED";
            return NextResponse.json(
                { error: e.message, code: e.code },
                { status: conflict ? 409 : 400 }
            );
        }
        console.error("[POST /api/superadmin/accounts]", e);
        return NextResponse.json({ error: "Failed to create superadmin" }, { status: 500 });
    }
}
