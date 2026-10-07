export { calculateCRC16 } from "./core/crc16";
export { parseTLV, parseQRIS, deriveNmid, deriveIssuer } from "./core/parser";
export { validateQRIS } from "./core/validator";
export { convertQRIS } from "./core/converter";
export { QRISError } from "./core/errors";
export { renderQRIS } from "./image/render";
export { decodeQRImage } from "./image/decode";
export { toDataURL, bytesToBase64 } from "./util/base64";
export type { QRISErrorCode } from "./core/errors";
export type {
  TLV,
  QRISInfo,
  QRISMethod,
  MerchantAccountInfo,
  ValidationResult,
  FeeOption,
  RenderOptions,
  ConvertOptions,
  ConvertResult,
  QRISImage,
  PixelData,
  QRISInput,
} from "./core/types";

import { parseQRIS } from "./core/parser";
import { decodeQRImage } from "./image/decode";
import type { QRISInfo, QRISInput } from "./core/types";

/** Parse QRIS from a string, PNG/JPEG bytes, or raw RGBA pixels. */
export function getQRISInfo(input: QRISInput): QRISInfo {
  if (typeof input === "string") return parseQRIS(input);
  return parseQRIS(decodeQRImage(input));
}
