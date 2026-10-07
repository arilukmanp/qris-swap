import { calculateCRC16 } from "./crc16";
import { parseTLV } from "./parser";
import type { ValidationResult } from "./types";

/** Validate a QRIS string for structural correctness and CRC integrity. */
export function validateQRIS(qrisString: string): ValidationResult {
  const errors: string[] = [];
  if (!qrisString || qrisString.trim().length === 0) {
    return { valid: false, errors: ["QRIS string is empty"] };
  }
  const str = qrisString.trim();

  if (!str.startsWith("000201")) {
    errors.push('QRIS must start with Payload Format Indicator "000201"');
  }
  if (str.length < 20) {
    errors.push("QRIS string is too short");
    return { valid: false, errors };
  }

  const declaredCRC = str.substring(str.length - 4);
  const calculatedCRC = calculateCRC16(str.substring(0, str.length - 4));
  if (declaredCRC.toUpperCase() !== calculatedCRC) {
    errors.push(`CRC mismatch: expected ${calculatedCRC}, got ${declaredCRC.toUpperCase()}`);
  }

  const elements = parseTLV(str);
  if (elements.length === 0) {
    errors.push("Failed to parse any TLV elements");
    return { valid: false, errors };
  }

  const tags = new Set(elements.map((e) => e.tag));
  const required: Array<[string, string]> = [
    ["00", "Payload Format Indicator"],
    ["01", "Point of Initiation Method"],
    ["52", "Merchant Category Code"],
    ["53", "Transaction Currency"],
    ["58", "Country Code"],
    ["59", "Merchant Name"],
    ["60", "Merchant City"],
    ["63", "CRC"],
  ];
  for (const [tag, name] of required) {
    if (!tags.has(tag)) errors.push(`Missing required tag ${tag} (${name})`);
  }

  const method = elements.find((e) => e.tag === "01");
  if (method && method.value !== "11" && method.value !== "12") {
    errors.push(`Invalid Point of Initiation Method: "${method.value}" (must be "11" or "12")`);
  }

  const hasMerchant = elements.some((e) => {
    const n = parseInt(e.tag, 10);
    return n >= 26 && n <= 51;
  });
  if (!hasMerchant) errors.push("No Merchant Account Information found (tags 26-51)");

  return { valid: errors.length === 0, errors };
}
