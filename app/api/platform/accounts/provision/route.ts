/**
 * POST /api/platform/accounts/provision
 *
 * Superadmin (or platform key) creates a shop owner who can sign in immediately.
 * No email verification code is issued.
 */
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PLANS, isValidPlanId } from "@/config/plans";
import { BUSINESS_TYPES } from "@/config/business-types";
import { createPasswordSchema } from "@/lib/password-requirements";
import { AuthError, provisionClientAccount } from "@/server/auth/auth-service";
import {
    requirePlatformAccess,
    resolveActiveSuperadminFromRequest,
} from "@/server/auth/api-request-auth";
import { PLATFORM_ACTIONS } from "@/server/platform/platform-activity-labels";
import { db } from "@/server/db";
import { superadminAuditLogs } from "@/server/db/schema/superadmin-audit-logs";

export const dynamic = "force-dynamic";

const businessTypeIds = new Set(BUSINESS_TYPES.map((type) => type.id));

const provisionSchema = z.object({
    businessName: z.string().trim().min(2).max(255),
    fullName: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(30).optional(),
    password: createPasswordSchema(),
    plan: z.string().refine(isValidPlanId, "Please select a valid plan"),
    businessType: z
        .string()
        .trim()
        .refine((value) => businessTypeIds.has(value as (typeof BUSINESS_TYPES)[number]["id"]), "Choose a shop type")
        .optional(),
});

export async function POST(req: NextRequest) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = provisionSchema.safeParse(body);
    if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        const first = Object.values(fieldErrors).flat().find((message) => message);
        return NextResponse.json(
            {
                error: first ?? "Check the account details and try again.",
                details: fieldErrors,
            },
            { status: 400 },
        );
    }

    try {
        const created = await provisionClientAccount({
            ...parsed.data,
            plan: parsed.data.plan as (typeof PLANS)[number]["id"],
        });

        const actor = await resolveActiveSuperadminFromRequest(req);
        if (actor) {
            const ip =
                req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                req.headers.get("x-real-ip") ||
                "Unknown";
            await db.insert(superadminAuditLogs).values({
                superadminId: actor.id,
                action: PLATFORM_ACTIONS.SHOP_ACCOUNT_CREATED,
                resource: "business",
                resourceId: created.businessId,
                metadata: {
                    email: created.email,
                    businessName: created.businessName,
                    plan: created.plan,
                },
                ipAddress: ip,
                userAgent: req.headers.get("user-agent") || "Unknown",
            });
        }

        return NextResponse.json(
            {
                message: "Account created. The owner can sign in with these details. No verification code is required.",
                userId: created.userId,
                businessId: created.businessId,
                email: created.email,
                businessName: created.businessName,
                plan: created.plan,
                loginPath: "/login",
            },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof AuthError) {
            const status = error.code === "DUPLICATE_EMAIL" ? 409 : 400;
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status },
            );
        }
        console.error("[provision] Unexpected error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 },
        );
    }
}
