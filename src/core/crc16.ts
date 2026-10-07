/**
 * CRC16-CCITT-FALSE checksum for QRIS/EMVCo payloads.
 * Polynomial 0x1021, init 0xFFFF, computed over UTF-8 bytes (per EMVCo spec).
 */
export function calculateCRC16(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}
