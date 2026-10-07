import { calculateCRC16 } from "./crc16";
import { getMerchantCategoryName } from "./mcc";
import type { MerchantAccountInfo, QRISInfo, TLV } from "./types";

/** Known EMVCo/QRIS root tag names. */
export const TAG_NAMES: Record<string, string> = {
  "00": "Payload Format Indicator",
  "01": "Point of Initiation Method",
  "02": "Visa",
  "03": "Mastercard",
  "04": "Mastercard",
  "15": "Visa",
  ...Object.fromEntries(
    Array.from(
      { length: 26 },
      (_, i) => [String(i + 26).padStart(2, "0"), "Merchant Account Information"] as [string, string],
    ),
  ),
  "52": "Merchant Category Code",
  "53": "Transaction Currency",
  "54": "Transaction Amount",
  "55": "Tip or Convenience Indicator",
  "56": "Value of Convenience Fee (Fixed)",
  "57": "Value of Convenience Fee (%)",
  "58": "Country Code",
  "59": "Merchant Name",
  "60": "Merchant City",
  "61": "Postal Code",
  "62": "Additional Data Field",
  "63": "CRC",
};

/** Child tag names inside the Additional Data Field (tag 62). */
const TAG62_CHILD_NAMES: Record<string, string> = {
  "01": "Bill Number",
  "02": "Mobile Number",
  "03": "Store Label",
  "04": "Loyalty Number",
  "05": "Reference Label",
  "06": "Customer Label",
  "07": "Terminal Label",
  "08": "Purpose of Transaction",
  "09": "Additional Consumer Data Request",
};

const NESTED_TAGS = new Set<number>([...Array.from({ length: 26 }, (_, i) => i + 26), 62]);

/** Parse a raw TLV string into elements; children parsed for tags 26–51 and 62. */
export function parseTLV(data: string, names: Record<string, string> = TAG_NAMES): TLV[] {
  const elements: TLV[] = [];
  let pos = 0;
  while (pos + 4 <= data.length) {
    const tag = data.substring(pos, pos + 2);
    const length = parseInt(data.substring(pos + 2, pos + 4), 10);
    if (Number.isNaN(length) || pos + 4 + length > data.length) break;
    const value = data.substring(pos + 4, pos + 4 + length);
    const el: TLV = { tag, name: names[tag] ?? `Unknown (${tag})`, length, value };
    const tagNum = parseInt(tag, 10);
    if (NESTED_TAGS.has(tagNum)) {
      el.children = parseTLV(value, tag === "62" ? TAG62_CHILD_NAMES : names);
    }
    elements.push(el);
    pos += 4 + length;
  }
  return elements;
}

const NMID_RE = /^ID\d{8,}$/;
const SITE_STRIP = new Set(["ID", "COM", "CO", "WWW"]);

/** NMID: templates 26–51, prefer tag 51, subtag 02 matching /^ID\d{8,}$/. */
export function deriveNmid(merchantAccounts: MerchantAccountInfo[]): string | undefined {
  const ordered = [...merchantAccounts].sort((a, b) =>
    a.tag === "51" ? -1 : b.tag === "51" ? 1 : parseInt(a.tag, 10) - parseInt(b.tag, 10),
  );
  for (const m of ordered) {
    const c = m.fields.find((f) => f.tag === "02");
    if (c && NMID_RE.test(c.value)) return c.value;
  }
  for (const m of ordered) {
    const c = m.fields.find((f) => f.tag === "01");
    if (c && NMID_RE.test(c.value)) return c.value;
  }
  return undefined;
}

/** Issuer: prefer acquirer templates (26–50), fall back to 51; strip ID/COM/CO/WWW labels. */
export function deriveIssuer(merchantAccounts: MerchantAccountInfo[]): string | undefined {
  const ordered = [...merchantAccounts].sort((a, b) => (a.tag === "51" ? 1 : 0) - (b.tag === "51" ? 1 : 0));
  for (const m of ordered) {
    const site = m.globallyUniqueId;
    if (!site || !site.includes(".")) continue;
    const labels = site.split(".").filter((l) => !SITE_STRIP.has(l.toUpperCase()));
    if (labels.length > 0) return labels.join("-");
  }
  return undefined;
}

/** Parse a QRIS string into a structured, JSON-friendly object. */
export function parseQRIS(qrisString: string): QRISInfo {
  const str = qrisString.trim();
  const raw = parseTLV(str);
  const findTag = (tag: string) => raw.find((t) => t.tag === tag);

  const methodValue = findTag("01")?.value;
  const method = methodValue === "12" ? "dynamic" : "static";

  const tipValue = findTag("55")?.value;
  const tipIndicator =
    tipValue === "01" ? "prompt" : tipValue === "02" ? "fixed" : tipValue === "03" ? "percentage" : undefined;

  const merchantAccountInfo: MerchantAccountInfo[] = raw
    .filter((t) => {
      const n = parseInt(t.tag, 10);
      return n >= 26 && n <= 51 && t.children !== undefined;
    })
    .map((t) => {
      const children = t.children ?? [];
      const findChild = (tag: string) => children.find((c) => c.tag === tag);
      return {
        tag: t.tag,
        globallyUniqueId: findChild("00")?.value ?? "",
        merchantId: findChild("01")?.value ?? findChild("02")?.value,
        merchantCriteria: findChild("03")?.value,
        fields: children,
      };
    });

  const crc = findTag("63")?.value ?? "";
  const crcValid = str.length > 4 && calculateCRC16(str.slice(0, -4)) === crc.toUpperCase();

  return {
    version: findTag("00")?.value ?? "01",
    method,
    merchantName: findTag("59")?.value ?? "",
    merchantCity: findTag("60")?.value ?? "",
    merchantCategoryCode: findTag("52")?.value ?? "",
    merchantCategory: getMerchantCategoryName(findTag("52")?.value ?? ""),
    issuer: deriveIssuer(merchantAccountInfo),
    nmid: deriveNmid(merchantAccountInfo),
    currency: findTag("53")?.value ?? "360",
    amount: findTag("54")?.value,
    tipIndicator,
    tipFixed: findTag("56")?.value,
    tipPercentage: findTag("57")?.value,
    countryCode: findTag("58")?.value ?? "ID",
    postalCode: findTag("61")?.value ?? "",
    additionalData: findTag("62")?.children,
    crc,
    crcValid,
    merchantAccountInfo,
    raw,
  };
}
