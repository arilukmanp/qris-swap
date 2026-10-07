import { describe, expect, test } from "vitest";
import { getQRISInfo, convertQRIS, renderQRIS } from "../src/index";
import { REAL_STATIC } from "./fixtures/qris";

// Mirrors the README quickstart snippets — keep in sync with README.md.
describe("README quickstart", () => {
  test("parse + convert + image", () => {
    const qrisString = REAL_STATIC;
    const info = getQRISInfo(qrisString);
    expect(info.merchantName).toBe("ARDIAN M. A. F., Toko Ala");
    expect(info.nmid).toBe("ID1026478871761");
    expect(info.issuer).toBe("GO-JEK");

    const result = convertQRIS(qrisString, {
      amount: 50000,
      fee: { type: "percentage", value: 2.5 },
    });
    expect(result.qris.endsWith("6304E79B")).toBe(true);
    expect(result.injectedAmount).toBe(1250);
    expect(result.total).toBe(51250);
    expect(result.image!.png.length).toBeGreaterThan(0);
  });

  test("parse from an image", () => {
    const png = renderQRIS(REAL_STATIC).png;
    expect(getQRISInfo(png).nmid).toBe("ID1026478871761");
  });
});
