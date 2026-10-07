import { encode as encodeQr, renderSVG } from "uqr";
import { encode as encodePng } from "fast-png";
import { QRISError } from "../core/errors";
import { toDataURL } from "../util/base64";
import type { QRISImage, RenderOptions } from "../core/types";

const DEFAULT_SCALE = 8;
const DEFAULT_BORDER = 4;

/** Render a QRIS string to a grayscale PNG (and optionally dataURL/SVG). */
export function renderQRIS(qrisString: string, opts: RenderOptions = {}): QRISImage {
  const scale = opts.scale ?? DEFAULT_SCALE;
  const border = opts.border ?? DEFAULT_BORDER;
  const ecc = opts.ecc ?? "M";
  if (!Number.isInteger(scale) || scale < 1) {
    throw new QRISError("INVALID_INPUT", "scale must be a positive integer");
  }
  if (!Number.isInteger(border) || border < 0) {
    throw new QRISError("INVALID_INPUT", "border must be a non-negative integer");
  }

  const { data: matrix } = encodeQr(qrisString, { ecc });
  const modules = matrix.length;
  const size = (modules + border * 2) * scale;
  const pixels = new Uint8Array(size * size).fill(255);
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (!matrix[y][x]) continue;
      for (let dy = 0; dy < scale; dy++) {
        const start = ((y + border) * scale + dy) * size + (x + border) * scale;
        pixels.fill(0, start, start + scale);
      }
    }
  }

  const png = encodePng({ width: size, height: size, data: pixels, channels: 1, depth: 8 });
  const image: QRISImage = { png, width: size, height: size };
  if (opts.dataUrl) image.dataUrl = toDataURL(png);
  if (opts.svg) image.svg = renderSVG(qrisString, { ecc, border });
  return image;
}
