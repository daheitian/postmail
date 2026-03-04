import { describe, it, expect } from "vitest";
import { uuidv7 } from "uuidv7";
import { toUid, fromUid, isValidUid } from "../uid.js";

describe("toUid", () => {
  it("encodes a UUID to a Base58 string", () => {
    const uuid = uuidv7();
    const result = toUid(uuid);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(22);
  });

  it("produces different strings for different UUIDs", () => {
    const a = toUid(uuidv7());
    const b = toUid(uuidv7());
    expect(a).not.toBe(b);
  });

  it("produces consistent results for the same UUID", () => {
    const uuid = uuidv7();
    expect(toUid(uuid)).toBe(toUid(uuid));
  });
});

describe("fromUid", () => {
  it("round-trips through toUid and fromUid", () => {
    for (let i = 0; i < 10; i++) {
      const uuid = uuidv7();
      const uid = toUid(uuid);
      expect(fromUid(uid)).toBe(uuid);
    }
  });

  it("returns null for empty string", () => {
    expect(fromUid("")).toBe(null);
  });

  it("returns null for invalid Base58", () => {
    expect(fromUid("!!!invalid!!!")).toBe(null);
  });

  it("returns null for wrong-length decoded bytes", () => {
    // Encode 8 bytes instead of 16 — should be rejected
    expect(fromUid("1")).toBe(null);
  });
});

describe("isValidUid", () => {
  it("returns true for valid encoded UIDs", () => {
    const uid = toUid(uuidv7());
    expect(isValidUid(uid)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidUid("")).toBe(false);
  });

  it("returns false for invalid strings", () => {
    expect(isValidUid("not-a-uid")).toBe(false);
  });
});
