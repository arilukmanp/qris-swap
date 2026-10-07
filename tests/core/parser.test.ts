import { describe, expect, test } from "vitest";
import { parseQRIS } from "../../src/core/parser";
import { EMVCO_SAMPLE, REAL_STATIC, SAMPLE_DYNAMIC_WITH_FEE, SAURUS_SAMPLE, syntheticBankNeo } from "../fixtures/qris";

describe("parseQRIS", () => {
  test("parses the real static payload (incl. NMID, issuer, MCC label)", () => {
    const info = parseQRIS(REAL_STATIC);
    expect(info.method).toBe("static");
    expect(info.merchantName).toBe("ARDIAN M. A. F., Toko Ala");
    expect(info.merchantCity).toBe("SURABAYA");
    expect(info.merchantCategoryCode).toBe("5970");
    expect(info.merchantCategory).toBe("Artist supply stores, craft shops");
    expect(info.issuer).toBe("GO-JEK");
    expect(info.nmid).toBe("ID1026478871761");
    expect(info.currency).toBe("360");
    expect(info.countryCode).toBe("ID");
    expect(info.postalCode).toBe("60232");
    expect(info.amount).toBeUndefined();
    expect(info.crc).toBe("485D");
    expect(info.crcValid).toBe(true);
    expect(info.additionalData?.find((c) => c.tag === "07")?.value).toBe("A01");
    expect(info.merchantAccountInfo).toHaveLength(2);
  });

  test("parses a dynamic payload with percentage fee", () => {
    const info = parseQRIS(SAMPLE_DYNAMIC_WITH_FEE);
    expect(info.method).toBe("dynamic");
    expect(info.amount).toBe("50000");
    expect(info.tipIndicator).toBe("percentage");
    expect(info.tipPercentage).toBe("2.5");
    expect(info.nmid).toBe("ID1026478871761");
    expect(info.crcValid).toBe(true);
  });

  test("fallback issuer from switching template; no NMID when absent", () => {
    const info = parseQRIS(SAURUS_SAMPLE);
    expect(info.issuer).toBe("QRIS");
    expect(info.nmid).toBeUndefined();
  });

  test("NMID preference: tag 51 wins over other templates", () => {
    const info = parseQRIS(syntheticBankNeo());
    expect(info.nmid).toBe("ID1023246989999");
    expect(info.merchantAccountInfo.map((m) => m.tag)).toEqual(["26", "51"]);
  });

  test("parses the EMVCo non-ASCII sample", () => {
    const info = parseQRIS(EMVCO_SAMPLE);
    expect(info.merchantName).toBe("BEST TRANSPORT");
    expect(info.merchantCity).toBe("BEIJING");
    expect(info.crcValid).toBe(true);
  });

  test("trims surrounding whitespace (same result as clean input)", () => {
    const padded = parseQRIS(`  ${REAL_STATIC}\n`);
    expect(padded.crcValid).toBe(true);
    expect(padded.merchantName).toBe("ARDIAN M. A. F., Toko Ala");
    expect(padded.raw[0]?.tag).toBe("00");
  });

  test("reports crcValid:false for a corrupted CRC without throwing (regression lock)", () => {
    const broken = REAL_STATIC.slice(0, -4) + "0000";
    const info = parseQRIS(broken);
    expect(info.crcValid).toBe(false);
    expect(info.merchantName).toBe("ARDIAN M. A. F., Toko Ala");
  });

  test("accepts a lowercase declared CRC (regression lock)", () => {
    const lower = REAL_STATIC.slice(0, -4) + REAL_STATIC.slice(-4).toLowerCase();
    expect(parseQRIS(lower).crcValid).toBe(true);
  });
});
