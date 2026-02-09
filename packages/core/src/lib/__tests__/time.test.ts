import { describe, it, expect, vi, afterEach } from "vitest";
import {
  now,
  isWithinMonth,
  toISOString,
  formatDate,
  formatYearMonth,
} from "../time.js";

describe("now", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns current time in seconds", () => {
    const before = Math.floor(Date.now() / 1000);
    const result = now();
    const after = Math.floor(Date.now() / 1000);
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });

  it("returns an integer (not milliseconds)", () => {
    const result = now();
    expect(Number.isInteger(result)).toBe(true);
    // Should be in seconds, not milliseconds (less than 10 billion)
    expect(result).toBeLessThan(10_000_000_000);
  });
});

describe("isWithinMonth", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for a timestamp within the last 30 days", () => {
    const recent = now() - 60 * 60; // 1 hour ago
    expect(isWithinMonth(recent)).toBe(true);
  });

  it("returns true for current timestamp", () => {
    expect(isWithinMonth(now())).toBe(true);
  });

  it("returns false for a timestamp older than 30 days", () => {
    const old = now() - 31 * 24 * 60 * 60; // 31 days ago
    expect(isWithinMonth(old)).toBe(false);
  });

  it("returns false for timestamp exactly at 30-day boundary", () => {
    // 30 days = 2592000 seconds
    const boundary = now() - 30 * 24 * 60 * 60;
    expect(isWithinMonth(boundary)).toBe(false);
  });

  it("returns true for timestamp just under 30 days", () => {
    const justUnder = now() - (30 * 24 * 60 * 60 - 1);
    expect(isWithinMonth(justUnder)).toBe(true);
  });
});

describe("toISOString", () => {
  it("converts Unix timestamp to ISO string", () => {
    // Feb 1, 2024 00:00:00 UTC
    expect(toISOString(1706745600)).toBe("2024-02-01T00:00:00.000Z");
  });

  it("converts epoch 0", () => {
    expect(toISOString(0)).toBe("1970-01-01T00:00:00.000Z");
  });

  it("handles timestamps with time components", () => {
    // 2024-01-15T12:30:00Z = 1705321800
    expect(toISOString(1705321800)).toBe("2024-01-15T12:30:00.000Z");
  });
});

describe("formatDate", () => {
  it("formats as MMM DD, YYYY", () => {
    expect(formatDate(1706745600)).toBe("Feb 1, 2024");
  });

  it("formats epoch start", () => {
    expect(formatDate(0)).toBe("Jan 1, 1970");
  });

  it("uses UTC timezone consistently", () => {
    // Dec 31, 2023 23:59:59 UTC
    const timestamp = 1704067199;
    expect(formatDate(timestamp)).toBe("Dec 31, 2023");
  });
});

describe("formatYearMonth", () => {
  it("formats as YYYY-MM", () => {
    expect(formatYearMonth(1706745600)).toBe("2024-02");
  });

  it("zero-pads single-digit months", () => {
    // Jan 15, 2024
    expect(formatYearMonth(1705276800)).toBe("2024-01");
  });

  it("handles December correctly", () => {
    // Dec 15, 2023
    expect(formatYearMonth(1702598400)).toBe("2023-12");
  });

  it("formats epoch start", () => {
    expect(formatYearMonth(0)).toBe("1970-01");
  });
});
