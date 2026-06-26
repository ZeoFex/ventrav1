import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import {
    adminAddBranchForBusiness,
    AdminBranchError,
} from "@/server/platform/platform-branch-service";
import { db } from "@/server/db";
import { branches } from "@/server/db/schema/branches";
import { BRANCH_ADDON_PRICE_MONTHLY_GHS } from "@/config/plans";

export const dynamic = "force-dynamic";

const row = {
    id: branches.id,
    businessId: branches.businessId,
    name: branches.name,
    code: branches.code,
    region: branches.region,
    address: branches.address,
    phone: branches.phone,
    isMain: branches.isMain,
    managerId: branches.managerId,
    status: branches.status,
    createdAt: branches.createdAt,
    updatedAt: branches.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(branches.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(branches).where(cond)
        : await db.select({ n: count() }).from(branches);

    const items = cond
        ? await db
              .select(row)
              .from(branches)
              .where(cond)
              .orderBy(desc(branches.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(branches)
              .orderBy(desc(branches.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}

const createBody = z.object({
    businessId: z.string().uuid(),
    name: z.string().trim().min(1).max(255),
    region: z.string().trim().max(100).optional(),
    businessType: z.string().trim().max(100).optional(),
});

/** Grant an extra branch (+ GHS 50/month subscription add-on). */
export async function POST(req: NextRequest) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) {
        return gate;
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid body", details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const result = await adminAddBranchForBusiness(parsed.data);
        return NextResponse.json(
            {
                branch: result.branch,
                paidExtraBranches: result.paidExtraBranches,
                monthlyAddonGhs:
                    result.paidExtraBranches * BRANCH_ADDON_PRICE_MONTHLY_GHS,
                chargedAddon: result.chargedAddon,
                message: result.chargedAddon
                    ? `Branch added. Subscription increased by GHS ${BRANCH_ADDON_PRICE_MONTHLY_GHS}/month.`
                    : "Branch added using an included plan slot.",
            },
            { status: 201 },
        );
    } catch (err) {
        if (err instanceof AdminBranchError) {
            const status = err.code === "NOT_FOUND" ? 404 : 400;
            return NextResponse.json({ error: err.message, code: err.code }, { status });
        }
        console.error("[POST /api/platform/branches]", err);
        return NextResponse.json({ error: "Failed to add branch" }, { status: 500 });
    }
}
