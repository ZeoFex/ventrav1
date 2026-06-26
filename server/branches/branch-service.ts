import { eq, and, count } from "drizzle-orm";
import { db } from "../db";
import { branches } from "../db/schema/branches";
import { businesses } from "../db/schema/businesses";
import { redis } from "../lib/redis";
import { getEffectiveMaxBranches, type PlanId } from "@/config/plans";

export class BranchLimitExceededError extends Error {
    readonly code = "BRANCH_LIMIT_EXCEEDED" as const;
    constructor(message: string) {
        super(message);
        this.name = "BranchLimitExceededError";
    }
}

const CACHE_KEYS = {
    LIST: (bizId: string) => `branches:biz_${bizId}:list`,
};

const CACHE_TTL = 3600; // 1 hour

export interface BranchInput {
    businessId: string;
    name: string;
    code?: string | null;
    region?: string | null;
    address?: string | null;
    phone?: string | null;
    isMain?: boolean;
    status?: "active" | "inactive";
}

/**
 * Fetch branches for a business.
 */
export async function getBranches(businessId: string) {
    const key = CACHE_KEYS.LIST(businessId);
    const cached = await redis.get(key);

    if (cached) {
        try {
            return JSON.parse(cached);
        } catch {
            // ignore parse fail
        }
    }

    const rows = await db
        .select()
        .from(branches)
        .where(eq(branches.businessId, businessId));

    await redis.setex(key, CACHE_TTL, JSON.stringify(rows));
    return rows;
}

/**
 * Save a new branch.
 */
export async function saveBranch(input: BranchInput) {
    const [biz] = await db
        .select({
            plan: businesses.plan,
            paidExtraBranches: businesses.paidExtraBranches,
        })
        .from(businesses)
        .where(eq(businesses.id, input.businessId))
        .limit(1);

    const plan = (biz?.plan ?? "starter") as PlanId;
    const maxBranches = getEffectiveMaxBranches(
        plan,
        biz?.paidExtraBranches ?? 0,
    );

    const [{ n }] = await db
        .select({ n: count() })
        .from(branches)
        .where(eq(branches.businessId, input.businessId));

    if (n >= maxBranches) {
        throw new BranchLimitExceededError(
            `Your ${plan} plan allows up to ${maxBranches} branch${maxBranches === 1 ? "" : "es"}. Upgrade your plan to add more.`,
        );
    }

    const [inserted] = await db
        .insert(branches)
        .values({
            businessId: input.businessId,
            name: input.name,
            code: input.code,
            region: input.region,
            address: input.address,
            phone: input.phone,
            isMain: input.isMain ?? false,
            status: input.status ?? "active",
        })
        .returning();

    await redis.del(CACHE_KEYS.LIST(input.businessId));
    return inserted;
}

/**
 * Update an existing branch.
 */
export async function updateBranch(businessId: string, branchId: string, input: Partial<BranchInput>) {
    const [updated] = await db
        .update(branches)
        .set({
            ...input,
            updatedAt: new Date(),
        })
        .where(and(eq(branches.id, branchId), eq(branches.businessId, businessId)))
        .returning();

    await redis.del(CACHE_KEYS.LIST(businessId));
    return updated;
}

/**
 * Get a single branch by ID.
 */
export async function getBranch(businessId: string, branchId: string) {
    const [row] = await db
        .select()
        .from(branches)
        .where(and(eq(branches.id, branchId), eq(branches.businessId, businessId)))
        .limit(1);

    return row || null;
}
