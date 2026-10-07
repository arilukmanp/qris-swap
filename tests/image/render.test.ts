import { describe, expect, test } from "vitest";
import { renderQRIS } from "../../src/image/render";
import { toDataURL } from "../../src/util/base64";
import { QRISError } from "../../src/core/errors";
import { SAMPLE_DYNAMIC_WITH_FEE } from "../fixtures/qris";

describe("renderQRIS", () => {
  test("default render: PNG only, 63 modules + 8 border at scale 8", () => {
    const img = renderQRIS(SAMPLE_DYNAMIC_WITH_FEE);
    expect(img.width).toBe(568);
    expect(img.height).toBe(568);
    expect(img.png).toBeInstanceOf(Uint8Array);
    expect(Array.from(img.png.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(img.dataUrl).toBeUndefined();
    expect(img.svg).toBeUndefined();
  });

  test("scale and border options change dimensions", () => {
    expect(renderQRIS(SAMPLE_DYNAMIC_WITH_FEE, { scale: 4 }).width).toBe(284);
    expect(renderQRIS(SAMPLE_DYNAMIC_WITH_FEE, { scale: 8, border: 2 }).width).toBe(536);
  });

  test("dataUrl and svg flags populate the fields", () => {
    const img = renderQRIS(SAMPLE_DYNAMIC_WITH_FEE, { dataUrl: true, svg: true });
    expect(img.dataUrl?.startsWith("data:image/png;base64,iVBOR")).toBe(true);
    expect(img.svg).toContain("<svg");
  });

  test("rejects invalid options", () => {
    expect(() => renderQRIS(SAMPLE_DYNAMIC_WITH_FEE, { scale: 0 })).toThrow(QRISError);
    expect(() => renderQRIS(SAMPLE_DYNAMIC_WITH_FEE, { border: -1 })).toThrow(QRISError);
  });

  test("toDataURL round-trips through atob", () => {
    const png = renderQRIS(SAMPLE_DYNAMIC_WITH_FEE).png;
    const b64 = toDataURL(png).split(",")[1];
    const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(decoded).toEqual(png);
  });
});
