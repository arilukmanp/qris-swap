import { describe, expect, test } from "vitest";
import { convertQRIS as ours, parseQRIS as ourParse, validateQRIS as ourValidate } from "../../src/index";
import { convertQRIS as refConvert, parseQRIS as refParse, validateQRIS as refValidate } from "../reference";
import { REAL_STATIC, SAURUS_SAMPLE, syntheticBankNeo } from "../fixtures/qris";

/** Drop `name` keys recursively (ours are enriched; structure must match). */
function stripNames(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNames);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => k !== "name")
        .map(([k, v]) => [k, stripNames(v)]),
    );
  }
  return value;
}

const FIXTURES = [REAL_STATIC, SAURUS_SAMPLE, syntheticBankNeo()];

describe("equivalence with the reference implementation (ASCII fixtures)", () => {
  test("parseQRIS produces structurally identical results", () => {
    for (const fixture of FIXTURES) {
      const mine = ourParse(fixture);
      const ref = refParse(fixture);
      const { nmid, issuer, merchantCategory, crcValid, ...base } = mine;
      expect(stripNames(base)).toEqual(stripNames(ref));
    }
  });

  test("convertQRIS produces byte-identical payloads (all fee modes)", () => {
    for (const fixture of FIXTURES) {
      for (const fee of [undefined, { type: "fixed" as const, value: 1000 }, { type: "percentage" as const, value: 2.5 }]) {
        const mine = ours(fixture, { amount: 50000, fee, render: false }).qris;
        const theirs = refConvert(fixture, { amount: 50000, fee });
        expect(mine).toBe(theirs);
      }
    }
  });

  test("validateQRIS results are identical (messages included)", () => {
    const broken = REAL_STATIC.slice(0, -4) + "0000";
    for (const input of [...FIXTURES, broken, "hello", ""]) {
      expect(ourValidate(input)).toEqual(refValidate(input));
    }
  });
});
