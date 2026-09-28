import { describe, it, expect } from "vitest";
import { toLocalDateTimeInputValue, parseLocalDateTimeInput } from "./dateUtils";

describe("datetime-local yardımcıları", () => {
  it("girilen değeri Türkiye saati olarak yorumlayıp geri aynı değere çevirir", () => {
    const ms = parseLocalDateTimeInput("2026-09-19T14:30");
    expect(ms).not.toBeNull();
    expect(toLocalDateTimeInputValue(ms!)).toBe("2026-09-19T14:30");
  });

  it("gece yarısını doğru işler", () => {
    const ms = parseLocalDateTimeInput("2026-09-19T00:05");
    expect(toLocalDateTimeInputValue(ms!)).toBe("2026-09-19T00:05");
  });

  it("geçersiz girdide null döner", () => {
    expect(parseLocalDateTimeInput("")).toBeNull();
    expect(parseLocalDateTimeInput("yanlis")).toBeNull();
  });
});
