import type { TLV } from "./types";

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
