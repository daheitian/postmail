import { describe, it, expect } from "vitest";
import { formatChars } from "../MediaGallery.js";

describe("formatChars", () => {
  it("shows raw count below 1000", () => {
    expect(formatChars(0)).toBe("0 chars");
    expect(formatChars(1)).toBe("1 chars");
    expect(formatChars(500)).toBe("500 chars");
    expect(formatChars(999)).toBe("999 chars");
  });

  it("formats thousands without trailing .0", () => {
    expect(formatChars(1000)).toBe("1k chars");
    expect(formatChars(4000)).toBe("4k chars");
    expect(formatChars(4023)).toBe("4k chars");
    expect(formatChars(10000)).toBe("10k chars");
    expect(formatChars(100000)).toBe("100k chars");
  });

  it("keeps meaningful decimal in thousands", () => {
    expect(formatChars(1500)).toBe("1.5k chars");
    expect(formatChars(4500)).toBe("4.5k chars");
    expect(formatChars(12300)).toBe("12.3k chars");
  });

  it("formats millions without trailing .0", () => {
    expect(formatChars(1000000)).toBe("1M chars");
    expect(formatChars(2000000)).toBe("2M chars");
  });

  it("keeps meaningful decimal in millions", () => {
    expect(formatChars(1500000)).toBe("1.5M chars");
    expect(formatChars(2300000)).toBe("2.3M chars");
  });
});
