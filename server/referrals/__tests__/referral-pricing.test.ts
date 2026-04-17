import { describe, it, expect } from "vitest";
import { applyReservedReferralDiscountPesewas } from "../referral-pricing";

describe("applyReservedReferralDiscountPesewas", () => {
    it("applies 20% (2000 bps) to 249 GHS monthly", () => {
        const { pesewas, discountGhs } = applyReservedReferralDiscountPesewas(
            249,
            2000,
        );
        expect(pesewas).toBe(19920);
        expect(discountGhs).toBeCloseTo(49.8, 5);
    });

    it("returns full amount when bps is 0", () => {
        const { pesewas, discountGhs } = applyReservedReferralDiscountPesewas(
            149,
            0,
        );
        expect(pesewas).toBe(14900);
        expect(discountGhs).toBe(0);
    });

    it("caps bps at max in pricing helper", () => {
        const { pesewas } = applyReservedReferralDiscountPesewas(100, 5000);
        expect(pesewas).toBe(8000);
    });
});
