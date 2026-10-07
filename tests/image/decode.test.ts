import { describe, expect, test } from "vitest";
import jpeg from "jpeg-js";
import { decode as decodePng } from "fast-png";
import { decodeQRImage } from "../../src/image/decode";
import { renderQRIS } from "../../src/image/render";
import { QRISError } from "../../src/core/errors";
import { REAL_STATIC } from "../fixtures/qris";

function rgbaFromGray(png: Uint8Array): { data: Uint8Array; width: number; height: number } {
  const dec = decodePng(png);
  const out = new Uint8Array(dec.width * dec.height * 4);
  for (let i = 0; i < dec.width * dec.height; i++) {
    const v = dec.data[i];
    out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255;
  }
  return { data: out, width: dec.width, height: dec.height };
}

describe("decodeQRImage", () => {
  test("decodes a PNG back to the exact string", () => {
    const png = renderQRIS(REAL_STATIC).png;
    expect(decodeQRImage(png)).toBe(REAL_STATIC);
  });

  test("decodes a JPEG", () => {
    const rgba = rgbaFromGray(renderQRIS(REAL_STATIC).png);
    const jpg = jpeg.encode(rgba, 90).data;
    expect(decodeQRImage(new Uint8Array(jpg))).toBe(REAL_STATIC);
  });

  test("decodes raw RGBA pixels", () => {
    const rgba = rgbaFromGray(renderQRIS(REAL_STATIC).png);
    expect(decodeQRImage(rgba)).toBe(REAL_STATIC);
  });

  test("throws QR_NOT_FOUND on an image without a QR", () => {
    const blank = new Uint8Array(100 * 100 * 4).fill(255);
    try {
      decodeQRImage({ data: blank, width: 100, height: 100 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(QRISError);
      expect((err as QRISError).code).toBe("QR_NOT_FOUND");
    }
  });

  test("throws UNSUPPORTED_IMAGE on unknown bytes", () => {
    try {
      decodeQRImage(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]));
      expect.unreachable();
    } catch (err) {
      expect((err as QRISError).code).toBe("UNSUPPORTED_IMAGE");
    }
  });

  test("throws IMAGE_DECODE_FAILED on corrupt PNG", () => {
    const corrupt = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    try {
      decodeQRImage(corrupt);
      expect.unreachable();
    } catch (err) {
      expect((err as QRISError).code).toBe("IMAGE_DECODE_FAILED");
    }
  });
});
