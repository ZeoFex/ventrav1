import { describe, expect, it } from "vitest";
import {
    accraDateKey,
    accraDayBounds,
    accraMonthBounds,
    accraWeekBounds,
    accraWeekEndKey,
    accraWeekStartKey,
    parseReferenceDateKey,
} from "../product-analytics-service";

describe("product-analytics period bounds", () => {
    it("parses ISO sale timestamp to Accra calendar day", () => {
        // 6 Jun 2026 02:37 am Accra (UTC+0)
        const key = parseReferenceDateKey("2026-06-06T02:37:00.000Z");
        expect(key).toBe("2026-06-06");
    });

    it("scopes daily window to exact Accra day", () => {
        const bounds = accraDayBounds("2026-06-06");
        expect(bounds.start.toISOString()).toBe("2026-06-06T00:00:00.000Z");
        expect(bounds.end.toISOString()).toBe("2026-06-06T23:59:59.999Z");
    });

    it("scopes weekly window Mon–Sun containing reference day", () => {
        // Sat 6 Jun 2026 → week Mon 1 Jun – Sun 7 Jun
        expect(accraWeekStartKey("2026-06-06")).toBe("2026-06-01");
        expect(accraWeekEndKey("2026-06-01")).toBe("2026-06-07");
        const bounds = accraWeekBounds("2026-06-06");
        expect(bounds.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
        expect(bounds.end.toISOString()).toBe("2026-06-07T23:59:59.999Z");
    });

    it("scopes monthly window to calendar month", () => {
        const bounds = accraMonthBounds("2026-06-06");
        expect(bounds.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
        expect(bounds.end.toISOString()).toBe("2026-06-30T23:59:59.999Z");
    });

    it("keeps June 5 and June 6 daily windows disjoint", () => {
        const june5 = accraDayBounds("2026-06-05");
        const june6 = accraDayBounds("2026-06-06");
        expect(june5.end.getTime()).toBeLessThan(june6.start.getTime());
    });

    it("defaults reference date to today in Accra when omitted", () => {
        const today = accraDateKey();
        expect(parseReferenceDateKey(null)).toBe(today);
    });
});
