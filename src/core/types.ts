export type QRISMethod = "static" | "dynamic";

export interface TLV {
  tag: string;
  name: string;
  length: number;
  value: string;
  children?: TLV[];
}

export interface MerchantAccountInfo {
  tag: string;
  globallyUniqueId: string;
  merchantId?: string;
  merchantCriteria?: string;
  fields: TLV[];
}

export interface QRISInfo {
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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FeeOption {
  type: "fixed" | "percentage";
  value: number;
}

export interface RenderOptions {
  scale?: number;
  border?: number;
  ecc?: "L" | "M" | "Q" | "H";
  dataUrl?: boolean;
  svg?: boolean;
}

export interface ConvertOptions {
  amount: number;
  fee?: FeeOption;
  render?: boolean | RenderOptions;
}

export interface QRISImage {
  png: Uint8Array;
  width: number;
  height: number;
  dataUrl?: string;
  svg?: string;
}

export interface ConvertResult {
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

export interface PixelData {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export type QRISInput = string | Uint8Array | PixelData;
