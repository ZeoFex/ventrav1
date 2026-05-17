import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { computePeriodEndAfterAddingDays } from "@/server/billing/subscription-period";
import { invalidateBusinessConfig, updateBusinessConfig } from "@/server/businesses/business-service";
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
        extendSubscriptionDays: z.number().int().min(1).max(3650).optional(),
    })
    .refine(
        (o) =>
            !(o.extendSubscriptionDays !== undefined && o.currentPeriodEnd !== undefined),
        {
            message: "Use either extendSubscriptionDays or currentPeriodEnd, not both",
            path: ["extendSubscriptionDays"],
        }
    )
    .refine((o) => Object.values(o).some((v) => v !== undefined), {
        message: "At least one field required",
    });

const uuidParam = z.string().uuid();

const deleteBody = z.object({
    confirmSlug: z.string().min(1),
});

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

    let nextPeriodEnd: Date | null | undefined;
    if (p.extendSubscriptionDays !== undefined) {
        const [biz] = await db
            .select({ currentPeriodEnd: businesses.currentPeriodEnd })
            .from(businesses)
            .where(eq(businesses.id, id))
            .limit(1);
        nextPeriodEnd = computePeriodEndAfterAddingDays({
            currentPeriodEnd: biz?.currentPeriodEnd,
            days: p.extendSubscriptionDays,
        });
    } else if (p.currentPeriodEnd !== undefined) {
        nextPeriodEnd = p.currentPeriodEnd === null ? null : new Date(p.currentPeriodEnd);
    }

    await updateBusinessConfig(id, {
        ...(p.name !== undefined ? { name: p.name } : {}),
        ...(p.status !== undefined ? { status: p.status } : {}),
        ...(p.plan !== undefined ? { plan: p.plan } : {}),
        ...(p.subscriptionStatus !== undefined ? { subscriptionStatus: p.subscriptionStatus } : {}),
        ...(p.extendSubscriptionDays !== undefined && p.subscriptionStatus === undefined
            ? { subscriptionStatus: "active" as const }
            : {}),
        ...(nextPeriodEnd !== undefined ? { currentPeriodEnd: nextPeriodEnd } : {}),
    });

    return NextResponse.json({ success: true });
}

/**
 * Hard-delete a tenant (CASCADE removes related rows). Requires body.confirmSlug matching the row slug.
 */
export async function DELETE(
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
    const parsed = deleteBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 }
        );
    }
    const confirmSlug = parsed.data.confirmSlug.trim();

    const [row] = await db
        .select({ id: businesses.id, slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (row.slug.trim() !== confirmSlug) {
        return NextResponse.json({ error: "confirmSlug does not match this business" }, { status: 400 });
    }

    await db.delete(businesses).where(eq(businesses.id, id));
    await invalidateBusinessConfig(id);

    return new NextResponse(null, { status: 204 });
}
