import { describe, expect, it } from "vitest";
import { formatAmountGrouping, parseAmountInput } from "../parse-amount";

describe("parseAmountInput", () => {
    it("treats commas as thousand separators", () => {
        expect(parseAmountInput("1,000")).toBe(1000);
        expect(parseAmountInput("1,000.50")).toBe(1000.5);
        expect(parseAmountInput("10,000")).toBe(10000);
    });

    it("parses plain numbers", () => {
        expect(parseAmountInput("1000")).toBe(1000);
        expect(parseAmountInput(249)).toBe(249);
    });
});

describe("formatAmountGrouping", () => {
    it("groups thousands with commas", () => {
        expect(formatAmountGrouping("1000")).toBe("1,000");
        expect(formatAmountGrouping("1000.5")).toBe("1,000.5");
        expect(formatAmountGrouping("1000.")).toBe("1,000.");
    });
});
