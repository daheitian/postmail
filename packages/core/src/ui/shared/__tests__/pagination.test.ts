import { describe, it, expect } from "vitest";
import { getPageNumbers } from "../../../lib/pagination.js";

describe("getPageNumbers", () => {
  it("returns all pages when totalPages <= 7", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shows ellipsis for gaps in large page ranges", () => {
    // Page 1 of 20: 1, 2, ..., 20
    const result = getPageNumbers(1, 20);
    expect(result).toEqual([1, 2, 0, 20]);
  });

  it("shows ellipsis on both sides for middle pages", () => {
    // Page 10 of 20: 1, ..., 9, 10, 11, ..., 20
    const result = getPageNumbers(10, 20);
    expect(result).toEqual([1, 0, 9, 10, 11, 0, 20]);
  });

  it("shows ellipsis only on right for early pages", () => {
    // Page 3 of 20: 1, 2, 3, 4, ..., 20
    const result = getPageNumbers(3, 20);
    expect(result).toEqual([1, 2, 3, 4, 0, 20]);
  });

  it("shows ellipsis only on left for late pages", () => {
    // Page 18 of 20: 1, ..., 17, 18, 19, 20
    const result = getPageNumbers(18, 20);
    expect(result).toEqual([1, 0, 17, 18, 19, 20]);
  });

  it("handles last page", () => {
    // Page 20 of 20: 1, ..., 19, 20
    const result = getPageNumbers(20, 20);
    expect(result).toEqual([1, 0, 19, 20]);
  });

  it("handles page 2 of large range", () => {
    // Page 2 of 20: 1, 2, 3, ..., 20
    const result = getPageNumbers(2, 20);
    expect(result).toEqual([1, 2, 3, 0, 20]);
  });
});
