import { describe, it, expect } from "vitest";
import { zeroTrackAlternateGroups } from "../mp4-track-flags.js";

const str4 = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));
const u32 = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];
const u16 = (n: number): number[] => [(n >>> 8) & 0xff, n & 0xff];
const box = (type: string, ...payload: number[][]): number[] => {
  const body = payload.flat();
  return [...u32(body.length + 8), ...str4(type), ...body];
};

/** A `tkhd` box with a given version and alternate_group value. */
function tkhd(version: 0 | 1, alternateGroup: number): number[] {
  // creation, modification, trackID, reserved: 4 fields, 4 or 8 bytes each.
  const idAndTimes =
    version === 1 ? new Array(24).fill(0) : new Array(16).fill(0);
  const duration = version === 1 ? new Array(8).fill(0) : new Array(4).fill(0);
  return box(
    "tkhd",
    [version, 0, 0, 0], // version + flags
    idAndTimes,
    duration,
    new Array(8).fill(0), // reserved[2]
    u16(0), // layer
    u16(alternateGroup),
    new Array(48).fill(0), // volume, reserved, matrix, width, height
  );
}

describe("zeroTrackAlternateGroups", () => {
  it("zeroes a non-zero alternate_group in every tkhd (v0)", () => {
    const bytes = new Uint8Array(
      box(
        "moov",
        box("trak", tkhd(0, 1), box("mdia", [])),
        box("trak", tkhd(0, 2), box("mdia", [])),
      ),
    );
    zeroTrackAlternateGroups(bytes.buffer);

    const view = new DataView(bytes.buffer);
    // Locate both tkhd boxes and confirm alternate_group is now 0.
    const groups: number[] = [];
    for (let i = 0; i + 8 <= bytes.length; i++) {
      if (
        String.fromCharCode(
          bytes[i + 4],
          bytes[i + 5],
          bytes[i + 6],
          bytes[i + 7],
        ) === "tkhd"
      ) {
        groups.push(view.getUint16(i + 8 + 4 + 20 + 8 + 2));
      }
    }
    expect(groups).toEqual([0, 0]);
  });

  it("handles version 1 tkhd boxes", () => {
    const bytes = new Uint8Array(box("moov", box("trak", tkhd(1, 7))));
    zeroTrackAlternateGroups(bytes.buffer);

    const view = new DataView(bytes.buffer);
    let offset = -1;
    for (let i = 0; i + 8 <= bytes.length; i++) {
      if (
        String.fromCharCode(
          bytes[i + 4],
          bytes[i + 5],
          bytes[i + 6],
          bytes[i + 7],
        ) === "tkhd"
      ) {
        offset = i + 8 + 4 + 32 + 8 + 2;
      }
    }
    expect(view.getUint16(offset)).toBe(0);
  });

  it("touches nothing but the alternate_group field", () => {
    const original = new Uint8Array(
      box(
        "moov",
        box("trak", tkhd(0, 0x0102), box("mdia", box("mdhd", u32(0)))),
      ),
    );
    const copy = new Uint8Array(original);
    zeroTrackAlternateGroups(copy.buffer);

    const diffs: number[] = [];
    for (let i = 0; i < original.length; i++) {
      if (original[i] !== copy[i]) diffs.push(i);
    }
    // Exactly the two bytes of one alternate_group field changed.
    expect(diffs).toHaveLength(2);
    expect(diffs[1]).toBe(diffs[0] + 1);
  });

  it("leaves an already-zero alternate_group untouched", () => {
    const original = new Uint8Array(box("moov", box("trak", tkhd(0, 0))));
    const copy = new Uint8Array(original);
    zeroTrackAlternateGroups(copy.buffer);
    expect([...copy]).toEqual([...original]);
  });

  it("ignores files with no tkhd box", () => {
    const original = new Uint8Array(box("ftyp", str4("isom")));
    const copy = new Uint8Array(original);
    zeroTrackAlternateGroups(copy.buffer);
    expect([...copy]).toEqual([...original]);
  });
});
