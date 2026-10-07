import { describe, expect, test } from "vitest";
import { validateQRIS } from "../../src/core/validator";
import { REAL_STATIC, SAMPLE_DYNAMIC_WITH_FEE } from "../fixtures/qris";

describe("validateQRIS", () => {
  test("valid payloads pass", () => {
    expect(validateQRIS(REAL_STATIC)).toEqual({ valid: true, errors: [] });
    expect(validateQRIS(SAMPLE_DYNAMIC_WITH_FEE)).toEqual({ valid: true, errors: [] });
  });

  test("rejects empty input", () => {
    expect(validateQRIS("  ")).toEqual({ valid: false, errors: ["QRIS string is empty"] });
  });

  test("reports CRC mismatch with computed/declared values", () => {
    const broken = REAL_STATIC.slice(0, -4) + "0000";
    const result = validateQRIS(broken);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toBe("CRC mismatch: expected 485D, got 0000");
  });

  test("accepts a lowercase declared CRC", () => {
    const lower = REAL_STATIC.slice(0, -4) + REAL_STATIC.slice(-4).toLowerCase();
    expect(validateQRIS(lower).valid).toBe(true);
  });

  test("reports structural problems", () => {
    expect(validateQRIS("hello world").valid).toBe(false);
    const result = validateQRIS("0002010203001236304ABCD");
    expect(result.errors.some((e) => e.includes("Missing required tag"))).toBe(true);
  });
});
