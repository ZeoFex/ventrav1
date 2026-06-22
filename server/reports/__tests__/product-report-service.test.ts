import { describe, expect, it } from "vitest";
import { resolveReportPeriod } from "../product-report-service";

describe("resolveReportPeriod", () => {
    it("scopes daily to a single Accra calendar day", () => {
        const period = resolveReportPeriod("daily", "2026-06-06");
        expect(period.fromKey).toBe("2026-06-06");
        expect(period.toKey).toBe("2026-06-06");
        expect(period.start.toISOString()).toBe("2026-06-06T00:00:00.000Z");
        expect(period.end.toISOString()).toBe("2026-06-06T23:59:59.999Z");
    });

    it("scopes weekly to Mon–Sun containing reference day", () => {
        const period = resolveReportPeriod("weekly", "2026-06-06");
        expect(period.fromKey).toBe("2026-06-01");
        expect(period.toKey).toBe("2026-06-07");
    });

    it("scopes monthly to calendar month", () => {
        const period = resolveReportPeriod("monthly", "2026-06-06");
        expect(period.fromKey).toBe("2026-06-01");
        expect(period.toKey).toBe("2026-06-30");
    });

    it("scopes all time from epoch through reference day end", () => {
        const period = resolveReportPeriod("all", "2026-06-06");
        expect(period.type).toBe("all");
        expect(period.label).toBe("All time");
        expect(period.end.toISOString()).toBe("2026-06-06T23:59:59.999Z");
    });

    it("scopes custom range and sorts inverted dates", () => {
        const period = resolveReportPeriod("custom", null, "2026-06-10", "2026-06-05");
        expect(period.fromKey).toBe("2026-06-05");
        expect(period.toKey).toBe("2026-06-10");
    });
});
