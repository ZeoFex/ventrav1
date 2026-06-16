/**
 * Onboarding service — saves setup wizard data into the DB.
 * Operates on the existing businesses & branches tables.
 * Runs in a single transaction for atomicity.
 */
import { eq, and } from "drizzle-orm";
import { PREMIUM_TRIAL_DAYS } from "@/config/plans";
import { db } from "../db";
import { businesses } from "../db/schema/businesses";
import { branches } from "../db/schema/branches";
import { auditLogs } from "../db/schema/audit-logs";
import { seedDefaultCategoriesForBusiness } from "../catalog/category-seed-service";

// ─── Types ──────────────────────────────────────────────────────

export interface OnboardingInput {
    businessId: string;
    userId: string;

    // From the wizard
    businessType: string | null;
    storeName: string;
    legalName: string;
    registrationId: string;
    phone: string;
    email: string;
    addressLine: string;
    city: string;
    region: string;
    currency: string;
    locale: string;
    taxRegistered: boolean;
    taxType: string;
    taxRate: string;
    logoUrl: string | null;
    receiptHeader: string;
    receiptFooter: string;
    schedule: Record<string, unknown>;
    structure: "single" | "multi" | null;
    branches: {
        name: string;
        region: string;
        isMain: boolean;
    }[];
    plan: "starter" | "growth" | "pro";
}

// ─── Complete Onboarding ────────────────────────────────────────

export async function completeOnboarding(input: OnboardingInput): Promise<void> {
    const now = new Date();

    await db.transaction(async (tx) => {
        // 1. Update the business record with all onboarding data
        await tx
            .update(businesses)
            .set({
                name: input.storeName.trim(),
                businessType: input.businessType,
                legalName: input.legalName.trim() || null,
                registrationId: input.registrationId.trim() || null,
                contactEmail: input.email.trim().toLowerCase(),
                phone: input.phone.trim() || null,
                address: input.addressLine.trim() || null,
                city: input.city.trim() || null,
                region: input.region || null,
                currency: input.currency,
                locale: input.locale,
                taxRegistered: input.taxRegistered,
                taxType: input.taxType,
                taxRate: input.taxRate,
                logoUrl: input.logoUrl || null,
                receiptHeader: input.receiptHeader.trim() || null,
                receiptFooter: input.receiptFooter.trim() || null,
                schedule: input.schedule,
                structure: input.structure,
                plan: input.plan,
                ...(input.plan === "growth" || input.plan === "pro"
                    ? {
                          subscriptionStatus: "active" as const,
                          currentPeriodEnd: new Date(
                              now.getTime() +
                                  PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000,
                          ),
                      }
                    : {
                          subscriptionStatus: "active" as const,
                          currentPeriodEnd: null,
                      }),
                onboardingCompleted: true,
                onboardingProgress: null,
                updatedAt: now,
            })
            .where(eq(businesses.id, input.businessId));

        // 2. Identify the 'Main Branch' created during signup
        //    We update THIS branch instead of recreating it for single-location stable IDs.
        let mainBranchData = {
            name: input.storeName.trim(),
            region: input.region || null,
        };

        // If multi-branch wizard was used, the first branch (marked isMain) is our primary update source
        if (input.structure === "multi" && input.branches.length > 0) {
            const wizardMain = input.branches.find(b => b.isMain) || input.branches[0];
            mainBranchData = {
                name: wizardMain.name.trim(),
                region: wizardMain.region || null,
            };
        }

        // Update the existing Main branch
        await tx
            .update(branches)
            .set({
                name: mainBranchData.name,
                region: mainBranchData.region,
                updatedAt: now,
            })
            .where(and(eq(branches.businessId, input.businessId), eq(branches.isMain, true)));

        // 3. Handle additional branches (multi-branch mode only)
        //    a) Clear ALL non-main branches
        await tx
            .delete(branches)
            .where(and(eq(branches.businessId, input.businessId), eq(branches.isMain, false)));

        //    b) Insert secondary branches if any
        if (input.structure === "multi" && input.branches.length > 1) {
            const secondaryBranches = input.branches.filter(b => !b.isMain);
            if (secondaryBranches.length > 0) {
                await tx.insert(branches).values(
                    secondaryBranches.map((b, i) => ({
                        businessId: input.businessId,
                        name: b.name.trim(),
                        code: `BR-${i + 1}`,
                        region: b.region || null,
                        isMain: false,
                    }))
                );
            }
        }

        // 4. Seed default categories for the main branch (shop type defaults)
        const [mainBranch] = await tx
            .select({ id: branches.id })
            .from(branches)
            .where(
                and(
                    eq(branches.businessId, input.businessId),
                    eq(branches.isMain, true),
                ),
            )
            .limit(1);

        if (mainBranch) {
            await seedDefaultCategoriesForBusiness(
                {
                    businessId: input.businessId,
                    branchId: mainBranch.id,
                    businessType: input.businessType,
                    skipIfExists: true,
                },
                tx as typeof db,
            );
        }

        // 5. Audit log
        await tx.insert(auditLogs).values({
            userId: input.userId,
            businessId: input.businessId,
            action: "onboarding_completed",
            resource: "business",
            resourceId: input.businessId,
            metadata: {
                structure: input.structure,
                branchCount: input.branches.length,
                taxType: input.taxType,
            },
        });
    });

    console.log(`[Onboarding] Completed for business ${input.businessId}`);
}
