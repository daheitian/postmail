/**
 * Blurhash Placeholder Tests
 */

import { describe, it, expect } from "vitest";
import { blurhashToDataUrl } from "../blurhash-placeholder.js";

describe("blurhashToDataUrl", () => {
  // A known valid blurhash string
  const HASH = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

  it("returns a data URL with BMP MIME type", () => {
    const url = blurhashToDataUrl(HASH);
    expect(url).toMatch(/^data:image\/bmp;base64,[A-Za-z0-9+/=]+$/);
  });

  it("produces valid BMP header bytes", () => {
    const url = blurhashToDataUrl(HASH, 4, 3);
    const base64 = url.replace("data:image/bmp;base64,", "");
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // BMP magic bytes
    expect(binary[0]).toBe(0x42); // 'B'
    expect(binary[1]).toBe(0x4d); // 'M'

    // File size matches buffer length
    const view = new DataView(binary.buffer);
    expect(view.getUint32(2, true)).toBe(binary.length);

    // Pixel data offset = 54
    expect(view.getUint32(10, true)).toBe(54);

    // DIB header size = 40
    expect(view.getUint32(14, true)).toBe(40);

    // Image dimensions
    expect(view.getInt32(18, true)).toBe(4); // width
    expect(view.getInt32(22, true)).toBe(3); // height

    // Bits per pixel = 24
    expect(view.getUint16(28, true)).toBe(24);
  });

  it("uses default dimensions of 4x3", () => {
    const url = blurhashToDataUrl(HASH);
    const base64 = url.replace("data:image/bmp;base64,", "");
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const view = new DataView(binary.buffer);

    expect(view.getInt32(18, true)).toBe(4);
    expect(view.getInt32(22, true)).toBe(3);
  });

  it("respects custom dimensions", () => {
    const url = blurhashToDataUrl(HASH, 8, 6);
    const base64 = url.replace("data:image/bmp;base64,", "");
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const view = new DataView(binary.buffer);

    expect(view.getInt32(18, true)).toBe(8);
    expect(view.getInt32(22, true)).toBe(6);
  });

  it("produces consistent output for the same input", () => {
    const url1 = blurhashToDataUrl(HASH);
    const url2 = blurhashToDataUrl(HASH);
    expect(url1).toBe(url2);
  });

  it("produces different output for different hashes", () => {
    const url1 = blurhashToDataUrl(HASH);
    const url2 = blurhashToDataUrl("LGF5]+Yk^6#M@-5c,1J5@[or[Q6.");
    expect(url1).not.toBe(url2);
  });
});
