import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { updateBusinessConfig } from "@/server/businesses/business-service";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

export const dynamic = "force-dynamic";

const patchBody = z
    .object({
        name: z.string().min(1).optional(),
        status: z.enum(["active", "suspended", "deactivated"]).optional(),
        plan: z.enum(["starter", "growth", "pro"]).optional(),
        subscriptionStatus: z.enum(["active", "past_due", "canceled"]).optional(),
        currentPeriodEnd: z.string().datetime().optional().nullable(),
    })
    .refine((o) => Object.values(o).some((v) => v !== undefined), {
        message: "At least one field required",
    });

const uuidParam = z.string().uuid();

function invalidBusinessIdResponse() {
    return NextResponse.json(
        {
            error:
                'Invalid business id: use a real UUID from GET /api/platform/businesses (OpenAPI "{id}" is a placeholder—set the id variable in Scalar).',
        },
        { status: 400 }
    );
}

/**
 * Get one business (full row except heavy JSON if needed for ops).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) {
        return gate;
    }
    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return invalidBusinessIdResponse();
    }
    const [row] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
}

/**
 * Update tenant profile / subscription fields (superadmin). Invalidates business config cache.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) {
        return gate;
    }
    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return invalidBusinessIdResponse();
    }
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = patchBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }
    const p = parsed.data;
    const [exists] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, id)).limit(1);
    if (!exists) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const currentPeriodEnd =
        p.currentPeriodEnd === null
            ? null
            : p.currentPeriodEnd !== undefined
              ? new Date(p.currentPeriodEnd)
              : undefined;

    await updateBusinessConfig(id, {
        ...(p.name !== undefined ? { name: p.name } : {}),
        ...(p.status !== undefined ? { status: p.status } : {}),
        ...(p.plan !== undefined ? { plan: p.plan } : {}),
        ...(p.subscriptionStatus !== undefined ? { subscriptionStatus: p.subscriptionStatus } : {}),
        ...(currentPeriodEnd !== undefined ? { currentPeriodEnd } : {}),
    });

    return NextResponse.json({ success: true });
}
