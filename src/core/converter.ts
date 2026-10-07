import { calculateCRC16 } from "./crc16";
import { parseQRIS, parseTLV } from "./parser";
import { renderQRIS } from "../image/render";
import { QRISError } from "./errors";
import type { ConvertOptions, ConvertResult, FeeOption, TLV } from "./types";

function buildTLVString(elements: TLV[]): string {
  return elements
    .map((el) => {
      const value = el.children ? buildTLVString(el.children) : el.value;
      return `${el.tag}${value.length.toString().padStart(2, "0")}${value}`;
    })
    .join("");
}

function makeTLV(tag: string, value: string, name = ""): TLV {
  return { tag, name, length: value.length, value };
}

function assertConvertible(elements: TLV[]): void {
  const tags = new Set(elements.map((e) => e.tag));
  const hasMerchant = elements.some((e) => {
    const n = parseInt(e.tag, 10);
    return n >= 26 && n <= 51;
  });
  if (elements.length === 0 || !tags.has("59") || !tags.has("63") || !hasMerchant) {
    throw new QRISError("NOT_QRIS", "Input is not a QRIS payload (missing merchant/name/CRC structure)");
  }
}

/** Port of the reference converter: inject amount (+ optional fee), set 01=12, recompute CRC. */
export function buildDynamicQRIS(qrisString: string, amount: number, fee?: FeeOption): string {
  const elements = parseTLV(qrisString);
  assertConvertible(elements);

  const result: TLV[] = [];
  const managed = new Set(["54", "55", "56", "57", "63"]);
  const hasMethodTag = elements.some((e) => e.tag === "01");
  let amountInserted = false;

  const pushAmountAndFee = () => {
    result.push(makeTLV("54", String(amount), "Transaction Amount"));
    if (fee) {
      if (fee.type === "fixed") {
        result.push(makeTLV("55", "02", "Tip or Convenience Indicator"));
        result.push(makeTLV("56", String(fee.value), "Value of Convenience Fee (Fixed)"));
      } else {
        result.push(makeTLV("55", "03", "Tip or Convenience Indicator"));
        result.push(makeTLV("57", String(fee.value), "Value of Convenience Fee (%)"));
      }
    }
    amountInserted = true;
  };

  for (const el of elements) {
    if (managed.has(el.tag)) continue;
    if (el.tag === "01") {
      result.push(makeTLV("01", "12", "Point of Initiation Method"));
      continue;
    }
    if (!hasMethodTag && el.tag === "00") {
      result.push(el);
      result.push(makeTLV("01", "12", "Point of Initiation Method"));
      continue;
    }
    if (el.tag === "58" && !amountInserted) pushAmountAndFee();
    result.push(el);
  }
  if (!amountInserted) pushAmountAndFee();

  const withoutCRC = buildTLVString(result);
  const crcInput = `${withoutCRC}6304`;
  return crcInput + calculateCRC16(crcInput);
}

/** Convert a static QRIS to dynamic and return enriched result data (+ optional QR image). */
export function convertQRIS(qrisString: string, options: ConvertOptions): ConvertResult {
  if (typeof qrisString !== "string" || qrisString.trim() === "") {
    throw new QRISError("INVALID_INPUT", "QRIS string is required");
  }
  const amount = options?.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new QRISError("INVALID_AMOUNT", "amount must be a positive number");
  }
  const fee = options.fee;
  if (fee && (typeof fee.value !== "number" || !Number.isFinite(fee.value) || fee.value <= 0)) {
    throw new QRISError("INVALID_FEE", "fee value must be a positive number");
  }

  const qris = buildDynamicQRIS(qrisString.trim(), amount, fee);
  const parsed = parseQRIS(qris);
  const injectedAmount = fee ? (fee.type === "fixed" ? fee.value : Math.round((amount * fee.value) / 100)) : 0;

  const result: ConvertResult = {
    qris,
    merchantName: parsed.merchantName,
    merchantCity: parsed.merchantCity,
    nmid: parsed.nmid,
    issuer: parsed.issuer,
    method: "dynamic",
    amount,
    injectedAmount,
    total: amount + injectedAmount,
    parsed,
  };
  if (fee) result.fee = fee;

  const renderOpt = options.render ?? true;
  if (renderOpt !== false) {
    result.image = renderQRIS(qris, typeof renderOpt === "object" ? renderOpt : undefined);
  }
  return result;
}
