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
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";

/** Accepts any JSON object; we don't want to reject a new field from the
 *  wizard before the server code catches up. Kept permissive on purpose. */
const progressSchema = z.object({
    stepIndex: z.number().int().min(0).max(50).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    updatedAt: z.string().optional(),
});

type StoredProgress = z.infer<typeof progressSchema>;

async function getSession(req: NextRequest) {
    const token = req.cookies.get(COOKIE_NAMES.ACCESS)?.value;
    if (!token) return null;
    try {
        const session = await verifyAccessToken(token);
        return { userId: session.sub, businessId: session.bid };
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const session = await getSession(req);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const [row] = await db
            .select({
                onboardingCompleted: businesses.onboardingCompleted,
                onboardingProgress: businesses.onboardingProgress,
            })
            .from(businesses)
            .where(eq(businesses.id, session.businessId))
            .limit(1);

        const progress = (row?.onboardingProgress ?? null) as StoredProgress | null;

        const response = NextResponse.json({
            onboardingCompleted: !!row?.onboardingCompleted,
            progress,
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
    const session = await getSession(req);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const session = await getSession(req);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
