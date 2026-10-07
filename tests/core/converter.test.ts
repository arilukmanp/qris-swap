import { describe, expect, test } from "vitest";
import { convertQRIS } from "../../src/core/converter";
import { decodeQRImage } from "../../src/image/decode";
import { QRISError } from "../../src/core/errors";
import { REAL_STATIC, SAMPLE_DYNAMIC_WITH_FEE } from "../fixtures/qris";

describe("convertQRIS", () => {
  test("amount only — exact payload (CRC 2C49)", () => {
    const r = convertQRIS(REAL_STATIC, { amount: 50000, render: false });
    expect(r.qris).toBe(
      "00020101021226610014COM.GO-JEK.WWW01189360091431799719630210G1799719630303UMI51440014ID.CO.QRIS.WWW0215ID1026478871761" +
        "0303UMI5204597053033605405500005802ID5925ARDIAN M. A. F., Toko Ala6008SURABAYA61056023262070703A0163042C49",
    );
    expect(r.method).toBe("dynamic");
    expect(r.merchantName).toBe("ARDIAN M. A. F., Toko Ala");
    expect(r.nmid).toBe("ID1026478871761");
    expect(r.injectedAmount).toBe(0);
    expect(r.total).toBe(50000);
    expect(r.image).toBeUndefined();
  });

  test("percentage fee — exact payload (CRC E79B) + injectedAmount", () => {
    const r = convertQRIS(REAL_STATIC, { amount: 50000, fee: { type: "percentage", value: 2.5 }, render: false });
    expect(r.qris).toBe(SAMPLE_DYNAMIC_WITH_FEE);
    expect(r.injectedAmount).toBe(1250);
    expect(r.total).toBe(51250);
    expect(r.fee).toEqual({ type: "percentage", value: 2.5 });
    expect(r.parsed.tipIndicator).toBe("percentage");
    expect(r.parsed.tipPercentage).toBe("2.5");
  });

  test("fixed fee — exact payload (CRC 60D1)", () => {
    const r = convertQRIS(REAL_STATIC, { amount: 50000, fee: { type: "fixed", value: 1000 }, render: false });
    expect(r.qris).toContain("55020256041000");
    expect(r.qris.endsWith("630460D1")).toBe(true);
    expect(r.injectedAmount).toBe(1000);
  });

  test("image included by default and decodes back to the payload", () => {
    const r = convertQRIS(REAL_STATIC, { amount: 50000 });
    expect(r.image).toBeDefined();
    expect(decodeQRImage(r.image!.png)).toBe(r.qris);
  });

  test("re-converting a dynamic payload replaces the amount", () => {
    const r = convertQRIS(SAMPLE_DYNAMIC_WITH_FEE, { amount: 10000, render: false });
    expect(r.parsed.amount).toBe("10000");
    expect(r.parsed.tipPercentage).toBeUndefined();
  });

  test("amounts are encoded as-is (non-integer, large)", () => {
    expect(convertQRIS(REAL_STATIC, { amount: 50000.5, render: false }).parsed.amount).toBe("50000.5");
    expect(convertQRIS(REAL_STATIC, { amount: 9999999999999, render: false }).parsed.amount).toBe("9999999999999");
  });

  test("trims surrounding whitespace", () => {
    const clean = convertQRIS(REAL_STATIC, { amount: 50000, render: false }).qris;
    expect(convertQRIS(`  ${REAL_STATIC}\n`, { amount: 50000, render: false }).qris).toBe(clean);
  });

  test("input validation errors", () => {
    const bad = (fn: () => unknown, code: string) => {
      try {
        fn();
        expect.unreachable();
      } catch (err) {
        expect(err).toBeInstanceOf(QRISError);
        expect((err as QRISError).code).toBe(code);
      }
    };
    bad(() => convertQRIS(REAL_STATIC, { amount: 0 }), "INVALID_AMOUNT");
    bad(() => convertQRIS(REAL_STATIC, { amount: -5 }), "INVALID_AMOUNT");
    bad(() => convertQRIS(REAL_STATIC, { amount: Number.NaN }), "INVALID_AMOUNT");
    bad(() => convertQRIS(REAL_STATIC, { amount: 1000, fee: { type: "fixed", value: 0 } }), "INVALID_FEE");
    bad(() => convertQRIS("hello world", { amount: 1000 }), "NOT_QRIS");
    bad(() => convertQRIS("", { amount: 1000 }), "INVALID_INPUT");
  });
});
