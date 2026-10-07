import { describe, expect, test } from "vitest";
import { parseTLV } from "../../src/core/parser";
import { SAURUS_SAMPLE, syntheticBankNeo } from "../fixtures/qris";

describe("parseTLV", () => {
  test("parses top-level elements in order", () => {
    const els = parseTLV(SAURUS_SAMPLE);
    expect(els.map((e) => e.tag)).toEqual(["00", "01", "26", "52", "53", "54", "58", "59", "60", "62", "63"]);
    expect(els[0]).toMatchObject({ tag: "00", length: 2, value: "01", name: "Payload Format Indicator" });
  });

  test("parses nested children for merchant account templates and additional data", () => {
    const els = parseTLV(syntheticBankNeo());
    const t26 = els.find((e) => e.tag === "26")!;
    expect(t26.children?.map((c) => c.tag)).toEqual(["00", "01", "02", "03"]);
    expect(t26.children?.find((c) => c.tag === "02")?.value).toBe("000590056565");
    const t62 = els.find((e) => e.tag === "62")!;
    expect(t62.children?.find((c) => c.tag === "07")?.value).toBe("T01");
  });

  test("stops cleanly on truncated input (no throw)", () => {
    expect(parseTLV("0002010").map((e) => e.tag)).toEqual(["00"]);
    expect(parseTLV("")).toEqual([]);
  });
});
