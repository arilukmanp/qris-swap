/**
 * CRC16-CCITT-FALSE checksum for QRIS/EMVCo payloads.
 * Polynomial 0x1021, init 0xFFFF, computed over UTF-8 bytes (per EMVCo spec).
 */
declare function calculateCRC16(input: string): string;

type QRISMethod = "static" | "dynamic";
interface TLV {
    tag: string;
    name: string;
    length: number;
    value: string;
    children?: TLV[];
}
interface MerchantAccountInfo {
    tag: string;
    globallyUniqueId: string;
    merchantId?: string;
    merchantCriteria?: string;
    fields: TLV[];
}
interface QRISInfo {
    version: string;
    method: QRISMethod;
    merchantName: string;
    merchantCity: string;
    merchantCategoryCode: string;
    merchantCategory?: string;
    issuer?: string;
    nmid?: string;
    currency: string;
    amount?: string;
    tipIndicator?: "prompt" | "fixed" | "percentage";
    tipFixed?: string;
    tipPercentage?: string;
    countryCode: string;
    postalCode: string;
    additionalData?: TLV[];
    crc: string;
    crcValid: boolean;
    merchantAccountInfo: MerchantAccountInfo[];
    raw: TLV[];
}
interface ValidationResult {
    valid: boolean;
    errors: string[];
}
interface FeeOption {
    type: "fixed" | "percentage";
    value: number;
}
interface RenderOptions {
    scale?: number;
    border?: number;
    ecc?: "L" | "M" | "Q" | "H";
    dataUrl?: boolean;
    svg?: boolean;
}
interface ConvertOptions {
    amount: number;
    fee?: FeeOption;
    render?: boolean | RenderOptions;
}
interface QRISImage {
    png: Uint8Array;
    width: number;
    height: number;
    dataUrl?: string;
    svg?: string;
}
interface ConvertResult {
    qris: string;
    merchantName: string;
    merchantCity: string;
    nmid?: string;
    issuer?: string;
    method: "dynamic";
    amount: number;
    fee?: FeeOption;
    injectedAmount: number;
    total: number;
    parsed: QRISInfo;
    image?: QRISImage;
}
interface PixelData {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
}
type QRISInput = string | Uint8Array | PixelData;

/** Parse a raw TLV string into elements; children parsed for tags 26–51 and 62. */
declare function parseTLV(data: string, names?: Record<string, string>): TLV[];
/** NMID: templates 26–51, prefer tag 51, subtag 02 matching /^ID\d{8,}$/. */
declare function deriveNmid(merchantAccounts: MerchantAccountInfo[]): string | undefined;
/** Issuer: prefer acquirer templates (26–50), fall back to 51; strip ID/COM/CO/WWW labels. */
declare function deriveIssuer(merchantAccounts: MerchantAccountInfo[]): string | undefined;
/** Parse a QRIS string into a structured, JSON-friendly object. */
declare function parseQRIS(qrisString: string): QRISInfo;

/** Validate a QRIS string for structural correctness and CRC integrity. */
declare function validateQRIS(qrisString: string): ValidationResult;

/** Convert a static QRIS to dynamic and return enriched result data (+ optional QR image). */
declare function convertQRIS(qrisString: string, options: ConvertOptions): ConvertResult;

type QRISErrorCode = "INVALID_INPUT" | "NOT_QRIS" | "INVALID_AMOUNT" | "INVALID_FEE" | "QR_NOT_FOUND" | "IMAGE_DECODE_FAILED" | "UNSUPPORTED_IMAGE";
declare class QRISError extends Error {
    readonly code: QRISErrorCode;
    constructor(code: QRISErrorCode, message: string);
}

/** Render a QRIS string to a grayscale PNG (and optionally dataURL/SVG). */
declare function renderQRIS(qrisString: string, opts?: RenderOptions): QRISImage;

/** Decode a QR code from PNG/JPEG bytes or raw RGBA pixels; returns the payload string. */
declare function decodeQRImage(input: Uint8Array | PixelData): string;

/** Base64-encode bytes without Buffer (Node ≥18 / browsers / Workers). */
declare function bytesToBase64(bytes: Uint8Array): string;
declare function toDataURL(png: Uint8Array): string;

/** Parse QRIS from a string, PNG/JPEG bytes, or raw RGBA pixels. */
declare function getQRISInfo(input: QRISInput): QRISInfo;

export { type ConvertOptions, type ConvertResult, type FeeOption, type MerchantAccountInfo, type PixelData, QRISError, type QRISErrorCode, type QRISImage, type QRISInfo, type QRISInput, type QRISMethod, type RenderOptions, type TLV, type ValidationResult, bytesToBase64, calculateCRC16, convertQRIS, decodeQRImage, deriveIssuer, deriveNmid, getQRISInfo, parseQRIS, parseTLV, renderQRIS, toDataURL, validateQRIS };
