import { describe, it, expect } from "vitest";
import { encode, decode, isValidSqid } from "../sqid.js";

describe("encode", () => {
  it("encodes a numeric ID to a string", () => {
    const result = encode(1);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it("produces minimum 4-character strings", () => {
    expect(encode(0).length).toBeGreaterThanOrEqual(4);
    expect(encode(1).length).toBeGreaterThanOrEqual(4);
    expect(encode(100).length).toBeGreaterThanOrEqual(4);
  });

  it("produces different strings for different IDs", () => {
    const a = encode(1);
    const b = encode(2);
    const c = encode(100);
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
  });

  it("produces consistent results for the same ID", () => {
    expect(encode(42)).toBe(encode(42));
  });
});

describe("decode", () => {
  it("decodes an encoded string back to the original ID", () => {
    for (const id of [0, 1, 42, 100, 999, 10000]) {
      const encoded = encode(id);
      expect(decode(encoded)).toBe(id);
    }
  });

  it("returns null for empty string", () => {
    expect(decode("")).toBe(null);
  });

  it("handles round-trip encoding", () => {
    const original = 12345;
    const sqid = encode(original);
    const decoded = decode(sqid);
    expect(decoded).toBe(original);
  });
});

describe("isValidSqid", () => {
  it("returns true for valid encoded sqids", () => {
    const sqid = encode(1);
    expect(isValidSqid(sqid)).toBe(true);
  });

  it("returns true for various valid sqids", () => {
    for (const id of [0, 1, 100, 999]) {
      expect(isValidSqid(encode(id))).toBe(true);
    }
  });

  it("returns false for empty string", () => {
    expect(isValidSqid("")).toBe(false);
  });
});
