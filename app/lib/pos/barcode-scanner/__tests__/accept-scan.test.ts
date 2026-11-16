import { describe, expect, it } from "vitest";
import {
  acceptCameraDecode,
  EMPTY_CAMERA_ACCEPT_STATE,
  gs1CheckDigit,
  hasValidGs1CheckDigit,
} from "../accept-scan";

const CLEAN = [0.01, 0.02, 0.04];
const NOISY = [0.4, 0.5, 0.2];

describe("gs1 check digits", () => {
  it("accepts a known EAN-13", () => {
    expect(hasValidGs1CheckDigit("5449000009746")).toBe(true);
    expect(gs1CheckDigit("544900000974")).toBe(6);
  });

  it("rejects a one-digit misread", () => {
    expect(hasValidGs1CheckDigit("5449000009747")).toBe(false);
  });
});

describe("acceptCameraDecode", () => {
  it("emits a clean EAN-13 unchanged", () => {
    const result = acceptCameraDecode({
      code: " 5449000009746 ",
      format: "ean_13",
      errors: CLEAN,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(result.emit).toBe("5449000009746");
  });

  it("drops a check-digit failure even when the frame looks sharp", () => {
    const result = acceptCameraDecode({
      code: "5449000009747",
      format: "ean_13",
      errors: CLEAN,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(result.emit).toBeNull();
  });

  it("keeps a slightly noisy EAN when the check digit is valid", () => {
    const result = acceptCameraDecode({
      code: "5449000009746",
      format: "ean_13",
      errors: [0.2, 0.22, 0.18],
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(result.emit).toBe("5449000009746");
  });

  it("drops a noisy frame", () => {
    const result = acceptCameraDecode({
      code: "5449000009746",
      format: "ean_13",
      errors: NOISY,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(result.emit).toBeNull();
  });

  it("waits for a second identical Code 128 read", () => {
    const first = acceptCameraDecode({
      code: "SKU-1001",
      format: "code_128",
      errors: CLEAN,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(first.emit).toBeNull();

    const second = acceptCameraDecode({
      code: "SKU-1001",
      format: "code_128",
      errors: CLEAN,
      now: 1_200,
      state: first.state,
    });
    expect(second.emit).toBe("SKU-1001");
  });

  it("accepts a 13-digit code with a valid check digit when format is missing", () => {
    const result = acceptCameraDecode({
      code: "5449000009746",
      errors: CLEAN,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(result.emit).toBe("5449000009746");
  });

  it("rejects a 13-digit misread when format is missing", () => {
    const result = acceptCameraDecode({
      code: "5449000009747",
      errors: CLEAN,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    expect(result.emit).toBeNull();
  });

  it("suppresses the same code during the cooldown", () => {
    const first = acceptCameraDecode({
      code: "5449000009746",
      format: "ean_13",
      errors: CLEAN,
      now: 1_000,
      state: EMPTY_CAMERA_ACCEPT_STATE,
    });
    const repeat = acceptCameraDecode({
      code: "5449000009746",
      format: "ean_13",
      errors: CLEAN,
      now: 1_400,
      state: first.state,
    });
    expect(repeat.emit).toBeNull();
  });
});
