import { describe, expect, test } from "vitest";
import {
  getQRISInfo, parseQRIS, validateQRIS, parseTLV, calculateCRC16,
  convertQRIS, renderQRIS, decodeQRImage, toDataURL, QRISError,
} from "../src/index";
import { REAL_STATIC } from "./fixtures/qris";

describe("public API", () => {
  test("all exports are functions/classes of the right shape", () => {
    for (const fn of [getQRISInfo, parseQRIS, validateQRIS, parseTLV, calculateCRC16, convertQRIS, renderQRIS, decodeQRImage, toDataURL]) {
      expect(typeof fn).toBe("function");
    }
    expect(typeof QRISError).toBe("function");
  });

  test("image input path works end to end", () => {
    const png = renderQRIS(REAL_STATIC).png;
    expect(getQRISInfo(png).nmid).toBe("ID1026478871761");
  });
});
