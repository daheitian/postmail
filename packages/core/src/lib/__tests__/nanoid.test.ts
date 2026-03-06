import { describe, it, expect } from "vitest";
import { generateRandomId } from "../nanoid.js";

describe("generateRandomId", () => {
  it("returns a string of the specified length", () => {
    expect(generateRandomId(5)).toHaveLength(5);
    expect(generateRandomId(8)).toHaveLength(8);
    expect(generateRandomId(1)).toHaveLength(1);
  });

  it("uses only lowercase alphanumeric characters", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateRandomId(10);
      expect(id).toMatch(/^[0-9a-z]+$/);
    }
  });

  it("generates unique values", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRandomId(8));
    }
    // With 36^8 possible values, collisions should be essentially impossible
    expect(ids.size).toBe(100);
  });
});
