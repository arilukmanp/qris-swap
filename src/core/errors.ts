export type QRISErrorCode =
  | "INVALID_INPUT"
  | "NOT_QRIS"
  | "INVALID_AMOUNT"
  | "INVALID_FEE"
  | "QR_NOT_FOUND"
  | "IMAGE_DECODE_FAILED"
  | "UNSUPPORTED_IMAGE";

export class QRISError extends Error {
  readonly code: QRISErrorCode;
  constructor(code: QRISErrorCode, message: string) {
    super(message);
    this.name = "QRISError";
    this.code = code;
  }
}
