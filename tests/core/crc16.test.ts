import { describe, expect, test } from "vitest";
import { calculateCRC16 } from "../../src/core/crc16";
import { EMVCO_SAMPLE, REAL_STATIC } from "../fixtures/qris";

function charCodeCrc(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

describe("calculateCRC16 (CRC-16/CCITT-FALSE over UTF-8 bytes)", () => {
  test("matches the official EMVCo spec sample", () => {
    expect(calculateCRC16(EMVCO_SAMPLE.slice(0, -4))).toBe("A13A");
  });

  test("matches independent implementation vector", () => {
    expect(calculateCRC16("0002010102116304")).toBe("AD0A");
  });

  test("validates a real-world payload", () => {
    expect(calculateCRC16(REAL_STATIC.slice(0, -4))).toBe(REAL_STATIC.slice(-4));
  });

  test("ASCII input equals the charCode-based algorithm (reference parity)", () => {
    expect(calculateCRC16(REAL_STATIC.slice(0, -4))).toBe(charCodeCrc(REAL_STATIC.slice(0, -4)));
  });

  test("non-ASCII input diverges from charCode-based CRC (spec fix)", () => {
    const body = EMVCO_SAMPLE.slice(0, -4);
    expect(calculateCRC16(body)).toBe("A13A");
    expect(charCodeCrc(body)).toBe("C919");
    expect(calculateCRC16(body)).not.toBe(charCodeCrc(body));
  });
});
