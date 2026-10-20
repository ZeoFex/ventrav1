import { describe, expect, it } from "vitest";
import { shouldStartNewWedgeBuffer } from "../wedge";

describe("shouldStartNewWedgeBuffer", () => {
  it("keeps characters that arrive in one scanner burst", () => {
    expect(shouldStartNewWedgeBuffer(1_000, 1_040)).toBe(false);
  });

  it("drops a stale prefix before the next scan", () => {
    expect(shouldStartNewWedgeBuffer(1_000, 1_700)).toBe(true);
  });

  it("starts empty when nothing has been typed", () => {
    expect(shouldStartNewWedgeBuffer(null, 1_000)).toBe(false);
  });
});
