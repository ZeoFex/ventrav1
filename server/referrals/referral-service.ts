import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";
import {
    REFERRAL_MAX_REWARD_BPS,
    REFERRAL_REWARD_BPS_PER_REFEREE,
} from "@/config/referrals";
import { customAlphabet } from "nanoid";

const referralCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const genReferralCode = customAlphabet(referralCodeAlphabet, 10);

export function normalizeReferralCode(raw: string | undefined | null): string {
    return (raw ?? "").trim().toUpperCase();
}

export async function resolveReferrerBusinessIdFromCode(
    code: string | undefined | null,
): Promise<string | null> {
    const normalized = normalizeReferralCode(code);
    if (!normalized) return null;
    const [row] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.referralCode, normalized))
        .limit(1);
    return row?.id ?? null;
}

/** Ensure the business has a unique referral code (for share links). */
export async function ensureReferralCodeForBusiness(
    businessId: string,
): Promise<string> {
    const [existing] = await db
        .select({
            referralCode: businesses.referralCode,
        })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .limit(1);

    if (existing?.referralCode) {
        return existing.referralCode;
    }

    for (let i = 0; i < 8; i++) {
        const candidate = genReferralCode();
        try {
            const [updated] = await db
                .update(businesses)
                .set({
                    referralCode: candidate,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(businesses.id, businessId),
                        isNull(businesses.referralCode),
                    ),
                )
                .returning({ referralCode: businesses.referralCode });
            if (updated?.referralCode) return updated.referralCode;
            const [again] = await db
                .select({ referralCode: businesses.referralCode })
                .from(businesses)
                .where(eq(businesses.id, businessId))
                .limit(1);
            if (again?.referralCode) return again.referralCode;
        } catch {
            /* unique collision — retry */
        }
    }

    throw new Error("Failed to allocate referral code");
}

/**
 * After a successful paid subscription charge: if this business was referred,
 * credit the referrer once (first qualifying payment only).
 */
export async function recordQualificationOnFirstPaidCharge(
    refereeBusinessId: string,
    firstChargeReference: string,
): Promise<void> {
    await db.transaction(async (tx) => {
        const [referee] = await tx
            .select({
                referredByBusinessId: businesses.referredByBusinessId,
            })
            .from(businesses)
            .where(eq(businesses.id, refereeBusinessId))
            .limit(1);

        const referrerId = referee?.referredByBusinessId;
        if (!referrerId || referrerId === refereeBusinessId) return;

        const inserted = await tx
            .insert(referralQualifications)
            .values({
                referrerBusinessId: referrerId,
                refereeBusinessId,
                firstChargeReference,
            })
            .onConflictDoNothing({
                target: referralQualifications.refereeBusinessId,
            })
            .returning({ id: referralQualifications.id });

        if (inserted.length === 0) return;

        const [referrer] = await tx
            .select({ referralRewardBps: businesses.referralRewardBps })
            .from(businesses)
            .where(eq(businesses.id, referrerId))
            .limit(1);

        const current = referrer?.referralRewardBps ?? 0;
        const next = Math.min(
            REFERRAL_MAX_REWARD_BPS,
            current + REFERRAL_REWARD_BPS_PER_REFEREE,
        );

        await tx
            .update(businesses)
            .set({
                referralRewardBps: next,
                updatedAt: new Date(),
            })
            .where(eq(businesses.id, referrerId));
    });
}

/** Owner-only: reserve full banked reward for the next subscription charge. */
export async function claimReferralDiscountForNextCharge(
    businessId: string,
): Promise<{ reservedBps: number; rewardBps: number }> {
    return db.transaction(async (tx) => {
        const [row] = await tx
            .select({
                referralRewardBps: businesses.referralRewardBps,
                referralDiscountReservedBps: businesses.referralDiscountReservedBps,
            })
            .from(businesses)
            .where(eq(businesses.id, businessId))
            .limit(1);

        const reward = row?.referralRewardBps ?? 0;
        if (reward <= 0) {
            return { reservedBps: 0, rewardBps: 0 };
        }

        const reserve = Math.min(reward, REFERRAL_MAX_REWARD_BPS);

        await tx
            .update(businesses)
            .set({
                referralDiscountReservedBps: reserve,
                updatedAt: new Date(),
            })
            .where(eq(businesses.id, businessId));

        return { reservedBps: reserve, rewardBps: reward };
    });
}

/**
 * After successful Paystack charge: clear applied discount from bank and reserved flag.
 */
export async function consumeReservedReferralDiscount(
    businessId: string,
): Promise<void> {
    await db.transaction(async (tx) => {
        const [row] = await tx
            .select({
                reserved: businesses.referralDiscountReservedBps,
                reward: businesses.referralRewardBps,
            })
            .from(businesses)
            .where(eq(businesses.id, businessId))
            .limit(1);

        const reserved = row?.reserved ?? 0;
        if (reserved <= 0) return;

        const reward = row?.reward ?? 0;
        const newReward = Math.max(0, reward - reserved);

        await tx
            .update(businesses)
            .set({
                referralDiscountReservedBps: 0,
                referralRewardBps: newReward,
                updatedAt: new Date(),
            })
            .where(eq(businesses.id, businessId));
    });
}
