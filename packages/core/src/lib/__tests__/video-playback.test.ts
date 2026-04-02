import { describe, expect, it } from "vitest";
import {
  normalizeDurationSeconds,
  shouldUseShortVideoExperience,
} from "../video-playback.js";

describe("normalizeDurationSeconds", () => {
  it("rounds up fractional durations for storage and heuristics", () => {
    expect(normalizeDurationSeconds(14.2)).toBe(15);
  });

  it("returns undefined for invalid durations", () => {
    expect(normalizeDurationSeconds(0)).toBeUndefined();
    expect(normalizeDurationSeconds(undefined)).toBeUndefined();
  });
});

describe("shouldUseShortVideoExperience", () => {
  it("accepts short lightweight videos", () => {
    expect(
      shouldUseShortVideoExperience({
        mimeType: "video/mp4",
        durationSeconds: 12,
        size: 3_000_000,
      }),
    ).toBe(true);
  });

  it("rejects longer videos", () => {
    expect(
      shouldUseShortVideoExperience({
        mimeType: "video/mp4",
        durationSeconds: 16,
        size: 3_000_000,
      }),
    ).toBe(false);
  });

  it("rejects oversized videos even when short", () => {
    expect(
      shouldUseShortVideoExperience({
        mimeType: "video/mp4",
        durationSeconds: 12,
        size: 20 * 1024 * 1024,
      }),
    ).toBe(false);
  });
});
