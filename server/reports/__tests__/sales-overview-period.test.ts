import { describe, expect, it } from "vitest";
import {
    enumerateAccraDateKeys,
    previousSalesOverviewPeriod,
    resolveSalesOverviewPeriod,
} from "../product-analytics-service";

describe("sales overview period", () => {
    it("defaults to 7 Accra days ending on reference to date", () => {
        const period = resolveSalesOverviewPeriod(null, "2026-06-06");
        expect(period.toKey).toBe("2026-06-06");
        expect(period.fromKey).toBe("2026-05-31");
        expect(period.dayCount).toBe(7);
        expect(period.start.toISOString()).toBe("2026-05-31T00:00:00.000Z");
        expect(period.end.toISOString()).toBe("2026-06-06T23:59:59.999Z");
    });

    it("enumerates inclusive date keys", () => {
        expect(enumerateAccraDateKeys("2026-06-05", "2026-06-07")).toEqual([
            "2026-06-05",
            "2026-06-06",
            "2026-06-07",
        ]);
    });

    it("computes previous period of equal length", () => {
        const current = resolveSalesOverviewPeriod("2026-06-01", "2026-06-07");
        const prev = previousSalesOverviewPeriod(current);
        expect(prev.fromKey).toBe("2026-05-25");
        expect(prev.toKey).toBe("2026-05-31");
        expect(prev.dayCount).toBe(7);
    });

    it("rejects inverted ranges", () => {
        expect(() => resolveSalesOverviewPeriod("2026-06-10", "2026-06-01")).toThrow(
            /Invalid date range/,
        );
    });
});
