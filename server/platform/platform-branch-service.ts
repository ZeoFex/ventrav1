/**
 * Platform admin branch operations — grant extra branches with subscription add-on.
 */
import { count, eq } from "drizzle-orm";
import { db } from "../db";
import { branches } from "../db/schema/branches";
import { businesses } from "../db/schema/businesses";
import { auditLogs } from "../db/schema/audit-logs";
import { redis } from "../lib/redis";
import {
    getEffectiveMaxBranches,
    MAX_BRANCHES_BY_PLAN,
    type PlanId,
} from "@/config/plans";
import { seedDefaultCategoriesForBusiness } from "../catalog/category-seed-service";

export class AdminBranchError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
        super(message);
        this.name = "AdminBranchError";
        this.code = code;
    }
}

export interface AdminAddBranchInput {
    businessId: string;
    name: string;
    region?: string | null;
    businessType?: string | null;
    actorId?: string;
}

export async function adminAddBranchForBusiness(input: AdminAddBranchInput) {
    const name = input.name.trim();
    if (!name) {
        throw new AdminBranchError("INVALID_NAME", "Branch name is required");
    }

    return db.transaction(async (tx) => {
        const [biz] = await tx
            .select({
                id: businesses.id,
                plan: businesses.plan,
                paidExtraBranches: businesses.paidExtraBranches,
                businessType: businesses.businessType,
            })
            .from(businesses)
            .where(eq(businesses.id, input.businessId))
            .limit(1);

        if (!biz) {
            throw new AdminBranchError("NOT_FOUND", "Business not found");
        }

        const plan = (biz.plan ?? "starter") as PlanId;
        const paidExtra = biz.paidExtraBranches ?? 0;
        const baseLimit = MAX_BRANCHES_BY_PLAN[plan] ?? 1;

        const [{ n: currentCount }] = await tx
            .select({ n: count() })
            .from(branches)
            .where(eq(branches.businessId, input.businessId));

        let newPaidExtra = paidExtra;
        if (currentCount >= baseLimit + paidExtra) {
            newPaidExtra = paidExtra + 1;
        }

        const maxAllowed = getEffectiveMaxBranches(plan, newPaidExtra);
        if (currentCount >= maxAllowed) {
            throw new AdminBranchError(
                "AT_LIMIT",
                `This shop is at its branch limit (${maxAllowed}). Upgrade their plan or add a paid branch slot.`,
            );
        }

        const branchNumber = currentCount + 1;
        const [inserted] = await tx
            .insert(branches)
            .values({
                businessId: input.businessId,
                name,
                code: `BR-${branchNumber}`,
                region: input.region?.trim() || null,
                businessType:
                    input.businessType?.trim() ||
                    biz.businessType ||
                    null,
                isMain: false,
                status: "active",
            })
            .returning();

        if (newPaidExtra !== paidExtra) {
            await tx
                .update(businesses)
                .set({
                    paidExtraBranches: newPaidExtra,
                    updatedAt: new Date(),
                })
                .where(eq(businesses.id, input.businessId));
        }

        await seedDefaultCategoriesForBusiness(
            {
                businessId: input.businessId,
                branchId: inserted.id,
                businessType:
                    inserted.businessType ?? biz.businessType,
                skipIfExists: true,
            },
            tx,
        );

        await tx.insert(auditLogs).values({
            userId: input.actorId ?? null,
            businessId: input.businessId,
            action: "admin_branch_added",
            resource: "branch",
            resourceId: inserted.id,
            metadata: {
                branchName: name,
                paidExtraBranches: newPaidExtra,
                chargedAddon: newPaidExtra > paidExtra,
            },
        });

        await redis.del(`branches:biz_${input.businessId}:list`);

        return {
            branch: inserted,
            paidExtraBranches: newPaidExtra,
            chargedAddon: newPaidExtra > paidExtra,
        };
    });
}
