import {
    REFERRAL_MAX_REWARD_BPS,
} from "@/config/referrals";

/**
 * Apply reserved referral discount to a GHS amount.
 * Amount is charged in pesewas (×100); round half-up to whole pesewas.
 */
export function applyReservedReferralDiscountPesewas(
    amountGhs: number,
    reservedBps: number,
): { pesewas: number; discountGhs: number } {
    const bps = Math.min(
        Math.max(0, reservedBps),
        REFERRAL_MAX_REWARD_BPS,
    );
    const basePesewas = Math.round(amountGhs * 100);
    if (bps === 0 || basePesewas <= 0) {
        return { pesewas: basePesewas, discountGhs: 0 };
    }
    const discountedPesewas = Math.round(
        (basePesewas * (10000 - bps)) / 10000,
    );
    const discountPesewas = basePesewas - discountedPesewas;
    return {
        pesewas: discountedPesewas,
        discountGhs: discountPesewas / 100,
    };
}
