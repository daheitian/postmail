import { describe, it, expect } from "vitest";
import {
  TIMEZONES,
  isSupportedTimeZone,
  mapIanaToTimezone,
  normalizeTimeZone,
} from "../timezones.js";

describe("TIMEZONES", () => {
  it("contains expected timezone entries", () => {
    expect(TIMEZONES.length).toBeGreaterThan(30);
    const shanghai = TIMEZONES.find((tz) => tz.value === "Asia/Shanghai");
    expect(shanghai).toBeDefined();
    expect(shanghai?.label).toBe("(UTC+08:00) Beijing");
  });

  it("each entry has required fields", () => {
    for (const tz of TIMEZONES) {
      expect(tz.value).toBeTruthy();
      expect(tz.label).toBeTruthy();
      expect(tz.offset).toBeTruthy();
      expect(tz.iana.length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate values", () => {
    const values = TIMEZONES.map((tz) => tz.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("mapIanaToTimezone", () => {
  it("maps Asia/Shanghai to the canonical stored value", () => {
    expect(mapIanaToTimezone("Asia/Shanghai")).toBe("Asia/Shanghai");
  });

  it("maps America/New_York to the canonical stored value", () => {
    expect(mapIanaToTimezone("America/New_York")).toBe("America/New_York");
  });

  it("maps Europe/London to the canonical stored value", () => {
    expect(mapIanaToTimezone("Europe/London")).toBe("Europe/London");
  });

  it("maps Asia/Tokyo to the canonical stored value", () => {
    expect(mapIanaToTimezone("Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("returns UTC for unknown timezone", () => {
    expect(mapIanaToTimezone("Unknown/Zone")).toBe("UTC");
  });

  it("returns UTC for empty string", () => {
    expect(mapIanaToTimezone("")).toBe("UTC");
  });

  it("maps Pacific/Honolulu to the canonical stored value", () => {
    expect(mapIanaToTimezone("Pacific/Honolulu")).toBe("Pacific/Honolulu");
  });

  it("maps Australia/Sydney to the canonical stored value", () => {
    expect(mapIanaToTimezone("Australia/Sydney")).toBe("Australia/Sydney");
  });
});

describe("normalizeTimeZone", () => {
  it("normalizes legacy display values to canonical IANA identifiers", () => {
    expect(normalizeTimeZone("Beijing")).toBe("Asia/Shanghai");
    expect(normalizeTimeZone("London")).toBe("Europe/London");
  });

  it("normalizes accepted IANA aliases to the curated canonical value", () => {
    expect(normalizeTimeZone("Asia/Calcutta")).toBe("Asia/Kolkata");
    expect(normalizeTimeZone("Etc/UTC")).toBe("UTC");
  });

  it("falls back to UTC for missing or unknown values", () => {
    expect(normalizeTimeZone("")).toBe("UTC");
    expect(normalizeTimeZone("Unknown/Zone")).toBe("UTC");
  });
});

describe("isSupportedTimeZone", () => {
  it("accepts canonical, aliased, and legacy values", () => {
    expect(isSupportedTimeZone("Asia/Shanghai")).toBe(true);
    expect(isSupportedTimeZone("Asia/Calcutta")).toBe(true);
    expect(isSupportedTimeZone("Beijing")).toBe(true);
  });

  it("rejects empty and unknown values", () => {
    expect(isSupportedTimeZone("")).toBe(false);
    expect(isSupportedTimeZone("Unknown/Zone")).toBe(false);
  });
});
