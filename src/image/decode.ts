import jsQR from "jsqr";
import { decode as decodePng, hasPngSignature } from "fast-png";
import jpeg from "jpeg-js";
import { QRISError } from "../core/errors";
import type { PixelData } from "../core/types";

function isPixelData(input: Uint8Array | PixelData): input is PixelData {
  return (input as PixelData).width !== undefined && (input as PixelData).height !== undefined;
}

function toClamped(data: Uint8Array | Uint8ClampedArray): Uint8ClampedArray {
  return data instanceof Uint8ClampedArray
    ? data
    : new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
}

/** Convert decoded PNG pixel data (1–4 channels, 8/16-bit) to RGBA. */
function toRgba(
  data: Uint8Array | Uint8ClampedArray | Uint16Array,
  pixelCount: number,
  channels: number,
  depth: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixelCount * 4);
  const scale = depth === 16 ? 1 / 256 : 1;
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    if (channels === 1) {
      const v = data[i] * scale;
      out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = 255;
    } else if (channels === 2) {
      const v = data[i * 2] * scale;
      out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = data[i * 2 + 1] * scale;
    } else if (channels === 3) {
      out[o] = data[i * 3] * scale;
      out[o + 1] = data[i * 3 + 1] * scale;
      out[o + 2] = data[i * 3 + 2] * scale;
      out[o + 3] = 255;
    } else {
      out[o] = data[i * 4] * scale;
      out[o + 1] = data[i * 4 + 1] * scale;
      out[o + 2] = data[i * 4 + 2] * scale;
      out[o + 3] = data[i * 4 + 3] * scale;
    }
  }
  return out;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Decode a QR code from PNG/JPEG bytes or raw RGBA pixels; returns the payload string. */
export function decodeQRImage(input: Uint8Array | PixelData): string {
  let rgba: Uint8ClampedArray;
  let width: number;
  let height: number;
  if (isPixelData(input)) {
    rgba = toClamped(input.data);
    width = input.width;
    height = input.height;
  } else if (hasPngSignature(input)) {
    try {
      const png = decodePng(input);
      rgba = toRgba(png.data, png.width * png.height, png.channels, png.depth);
      width = png.width;
      height = png.height;
    } catch {
      throw new QRISError("IMAGE_DECODE_FAILED", "Could not decode the PNG image");
    }
  } else if (isJpeg(input)) {
    try {
      const jpg = jpeg.decode(input, { useTArray: true, formatAsRGBA: true });
      rgba = toClamped(jpg.data);
      width = jpg.width;
      height = jpg.height;
    } catch {
      throw new QRISError("IMAGE_DECODE_FAILED", "Could not decode the JPEG image");
    }
  } else {
    throw new QRISError("UNSUPPORTED_IMAGE", "Unsupported image format — provide PNG, JPEG, or raw RGBA pixels");
  }

  const result = jsQR(rgba, width, height);
  if (!result) throw new QRISError("QR_NOT_FOUND", "No QR code found in the image");
  return result.data;
}
