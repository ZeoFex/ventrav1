/**
 * POST /api/onboarding/complete
 *
 * Saves all onboarding wizard data to the database.
 * Authenticates via the HTTP-only JWT access token cookie.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { completeOnboarding } from "@/server/onboarding/onboarding-service";
import { requireUserAuth } from "@/server/auth/api-request-auth";

const branchSchema = z.object({
    name: z.string().min(1, "Branch name required"),
    region: z.string(),
    isMain: z.boolean(),
});

const bodySchema = z.object({
    businessType: z.string().nullable(),
    storeName: z.string().min(1, "Store name is required"),
    legalName: z.string().default(""),
    registrationId: z.string().default(""),
    phone: z.string().default(""),
    email: z.string().email("Invalid email"),
    addressLine: z.string().default(""),
    city: z.string().default(""),
    region: z.string().default(""),
    currency: z.string().default("GHS"),
    locale: z.string().default("en-GH"),
    taxRegistered: z.boolean().default(false),
    taxType: z.string().default("none"),
    taxRate: z.string().default("0"),
    logoUrl: z.string().nullable().default(null),
    receiptHeader: z.string().default(""),
    receiptFooter: z.string().default(""),
    schedule: z.record(z.string(), z.unknown()).default({}),
    structure: z.enum(["single", "multi"]).nullable().default(null),
    branches: z.array(branchSchema).default([]),
    plan: z.enum(["starter", "growth", "pro"]).default("starter"),
    cycle: z.enum(["monthly", "annually"]).default("annually"),
});

export async function POST(req: NextRequest) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const session = auth.payload;

        const userId = session.sub;
        const businessId = session.bid;

        // 2. Parse and validate body
        const raw = await req.json();
        const parsed = bodySchema.safeParse(raw);

        if (!parsed.success) {
            const fieldErrors = parsed.error.flatten().fieldErrors;
            console.error("[onboarding/complete] Validation failed:", fieldErrors);
            return NextResponse.json(
                { error: "Validation failed", details: fieldErrors },
                { status: 400 }
            );
        }

        // 3. Complete onboarding using authenticated IDs
        await completeOnboarding({
            ...parsed.data,
            userId,
            businessId,
        });

        return NextResponse.json(
            { message: "Onboarding completed successfully" },
            { status: 200 }
        );
    } catch (err) {
        console.error("[POST /api/onboarding/complete] Error:", err);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
