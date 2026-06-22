/**
 * /api/onboarding/progress
 *
 * GET  → load the saved onboarding wizard snapshot for the signed-in user,
 *        plus whether onboarding is already completed (so the client can
 *        decide to stay or redirect to the dashboard).
 *
 * PUT  → persist the current wizard snapshot (step index + form data).
 *        Lets a user resume the wizard after closing the tab/browser
 *        or switching devices.
 *
 * DELETE → clear any saved snapshot (called implicitly when onboarding
 *          completes; exposed for defensive cleanup paths).
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { users } from "@/server/db/schema/users";
import { requireUserAuth } from "@/server/auth/api-request-auth";

/** Accepts any JSON object; we don't want to reject a new field from the
 *  wizard before the server code catches up. Kept permissive on purpose. */
const progressSchema = z.object({
    stepIndex: z.number().int().min(0).max(50).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    updatedAt: z.string().optional(),
});

type StoredProgress = z.infer<typeof progressSchema>;

export async function GET(req: NextRequest) {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const session = { userId: auth.payload.sub, businessId: auth.payload.bid };

    try {
        const [row] = await db
            .select({
                onboardingCompleted: businesses.onboardingCompleted,
                onboardingProgress: businesses.onboardingProgress,
                businessPhone: businesses.phone,
                businessEmail: businesses.contactEmail,
            })
            .from(businesses)
            .where(eq(businesses.id, session.businessId))
            .limit(1);

        const [userRow] = await db
            .select({ phone: users.phone, email: users.email })
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1);

        const progress = (row?.onboardingProgress ?? null) as StoredProgress | null;

        const response = NextResponse.json({
            onboardingCompleted: !!row?.onboardingCompleted,
            progress,
            accountDefaults: {
                phone: row?.businessPhone || userRow?.phone || null,
                email: row?.businessEmail || userRow?.email || null,
            },
        });
        response.headers.set("Cache-Control", "no-store");
        return response;
    } catch (err) {
        console.error("[GET /api/onboarding/progress] Error:", err);
        return NextResponse.json(
            { error: "Failed to load progress" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const session = { userId: auth.payload.sub, businessId: auth.payload.bid };

    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = progressSchema.safeParse(raw);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    try {
        const payload: StoredProgress = {
            ...parsed.data,
            updatedAt: new Date().toISOString(),
        };

        await db
            .update(businesses)
            .set({ onboardingProgress: payload, updatedAt: new Date() })
            .where(eq(businesses.id, session.businessId));

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[PUT /api/onboarding/progress] Error:", err);
        return NextResponse.json(
            { error: "Failed to save progress" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const auth = await requireUserAuth(req);
    if (auth instanceof NextResponse) return auth;
    const session = { userId: auth.payload.sub, businessId: auth.payload.bid };

    try {
        await db
            .update(businesses)
            .set({ onboardingProgress: null, updatedAt: new Date() })
            .where(eq(businesses.id, session.businessId));
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("[DELETE /api/onboarding/progress] Error:", err);
        return NextResponse.json(
            { error: "Failed to clear progress" },
            { status: 500 }
        );
    }
}
