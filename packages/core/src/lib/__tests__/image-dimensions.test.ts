/**
 * Image dimensions parser tests.
 *
 * Each test constructs the minimal valid header bytes for a format and
 * verifies that {@link parseImageDimensions} extracts width/height.
 */

import { describe, expect, it } from "vitest";
import { parseImageDimensions } from "../image-dimensions.js";

describe("parseImageDimensions", () => {
  describe("PNG", () => {
    it("parses width and height from the IHDR chunk", () => {
      const bytes = buildPng(1280, 720);
      expect(parseImageDimensions("image/png", bytes)).toEqual({
        width: 1280,
        height: 720,
      });
    });

    it("returns null when the PNG signature is wrong", () => {
      const bytes = buildPng(10, 10);
      bytes[0] = 0;
      expect(parseImageDimensions("image/png", bytes)).toBeNull();
    });

    it("returns null when the buffer is too short", () => {
      expect(parseImageDimensions("image/png", new Uint8Array(10))).toBeNull();
    });
  });

  describe("JPEG", () => {
    it("parses dimensions from the SOF0 marker", () => {
      const bytes = buildJpeg(800, 600);
      expect(parseImageDimensions("image/jpeg", bytes)).toEqual({
        width: 800,
        height: 600,
      });
    });

    it("skips APP segments before reaching SOF", () => {
      const bytes = buildJpegWithApp(1920, 1080);
      expect(parseImageDimensions("image/jpeg", bytes)).toEqual({
        width: 1920,
        height: 1080,
      });
    });

    it("returns null when SOI marker is missing", () => {
      const bytes = new Uint8Array([0x00, 0x00, 0xff, 0xc0]);
      expect(parseImageDimensions("image/jpeg", bytes)).toBeNull();
    });
  });

  describe("GIF", () => {
    it("parses width and height from the logical screen descriptor", () => {
      const bytes = buildGif(640, 480);
      expect(parseImageDimensions("image/gif", bytes)).toEqual({
        width: 640,
        height: 480,
      });
    });
  });

  describe("WebP", () => {
    it("parses VP8 (lossy) dimensions", () => {
      const bytes = buildWebpVp8(1024, 768);
      expect(parseImageDimensions("image/webp", bytes)).toEqual({
        width: 1024,
        height: 768,
      });
    });

    it("parses VP8L (lossless) dimensions", () => {
      const bytes = buildWebpVp8L(300, 200);
      expect(parseImageDimensions("image/webp", bytes)).toEqual({
        width: 300,
        height: 200,
      });
    });

    it("parses VP8X (extended) dimensions", () => {
      const bytes = buildWebpVp8X(4096, 4096);
      expect(parseImageDimensions("image/webp", bytes)).toEqual({
        width: 4096,
        height: 4096,
      });
    });

    it("returns null when RIFF header is missing", () => {
      const bytes = buildWebpVp8(10, 10);
      bytes[0] = 0;
      expect(parseImageDimensions("image/webp", bytes)).toBeNull();
    });
  });

  describe("AVIF", () => {
    it("parses dimensions from the ispe box", () => {
      const bytes = buildAvif(2000, 1500);
      expect(parseImageDimensions("image/avif", bytes)).toEqual({
        width: 2000,
        height: 1500,
      });
    });

    it("accepts AVIF declared via compatible_brands", () => {
      const bytes = buildAvif(500, 500, { majorBrand: "mif1" });
      expect(parseImageDimensions("image/avif", bytes)).toEqual({
        width: 500,
        height: 500,
      });
    });
  });

  describe("unsupported types", () => {
    it("returns null for SVG", () => {
      const bytes = new TextEncoder().encode(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>',
      );
      expect(parseImageDimensions("image/svg+xml", bytes)).toBeNull();
    });

    it("returns null for unknown mime types", () => {
      expect(parseImageDimensions("image/bmp", new Uint8Array(64))).toBeNull();
      expect(parseImageDimensions("text/plain", new Uint8Array(64))).toBeNull();
    });
  });
});

// ── Fixture builders ──────────────────────────────────────────────────

function buildPng(width: number, height: number): Uint8Array {
  // Signature + IHDR chunk header. Only the first 24 bytes are inspected.
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false); // IHDR chunk length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

function buildJpeg(width: number, height: number): Uint8Array {
  // SOI + SOF0(payload: 8 bytes precision/height/width/components)
  const bytes = new Uint8Array(2 + 2 + 8);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xc0; // SOF0
  bytes[4] = 0x00;
  bytes[5] = 0x08; // segment length
  bytes[6] = 0x08; // precision (8-bit)
  bytes[7] = (height >> 8) & 0xff;
  bytes[8] = height & 0xff;
  bytes[9] = (width >> 8) & 0xff;
  bytes[10] = width & 0xff;
  bytes[11] = 0x03; // components
  return bytes;
}

function buildJpegWithApp(width: number, height: number): Uint8Array {
  // SOI + APP0 (length 16) + SOF0
  const appPayload = 14; // 16-byte segment - 2 length bytes
  const total = 2 + 2 + 2 + appPayload + 2 + 8;
  const bytes = new Uint8Array(total);
  let i = 0;
  bytes[i++] = 0xff;
  bytes[i++] = 0xd8;
  bytes[i++] = 0xff;
  bytes[i++] = 0xe0; // APP0
  bytes[i++] = 0x00;
  bytes[i++] = 0x10; // length 16
  i += appPayload;
  bytes[i++] = 0xff;
  bytes[i++] = 0xc2; // SOF2 (progressive — also recognized)
  bytes[i++] = 0x00;
  bytes[i++] = 0x08;
  bytes[i++] = 0x08;
  bytes[i++] = (height >> 8) & 0xff;
  bytes[i++] = height & 0xff;
  bytes[i++] = (width >> 8) & 0xff;
  bytes[i++] = width & 0xff;
  bytes[i] = 0x03;
  return bytes;
}

function buildGif(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(10);
  bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
  bytes[6] = width & 0xff;
  bytes[7] = (width >> 8) & 0xff;
  bytes[8] = height & 0xff;
  bytes[9] = (height >> 8) & 0xff;
  return bytes;
}

function buildWebpHeader(chunk: string, payloadLen: number): Uint8Array {
  const totalChunk = 8 + payloadLen;
  const bytes = new Uint8Array(12 + totalChunk);
  bytes.set([0x52, 0x49, 0x46, 0x46]); // RIFF
  const view = new DataView(bytes.buffer);
  view.setUint32(4, 4 + totalChunk, true); // file size minus 8
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
  for (let i = 0; i < 4; i += 1) {
    bytes[12 + i] = chunk.charCodeAt(i);
  }
  view.setUint32(16, payloadLen, true);
  return bytes;
}

function buildWebpVp8(width: number, height: number): Uint8Array {
  // VP8 chunk: 10-byte frame header + signature 0x9d 0x01 0x2a + width/height
  const payloadLen = 16;
  const bytes = buildWebpHeader("VP8 ", payloadLen);
  bytes[23] = 0x9d;
  bytes[24] = 0x01;
  bytes[25] = 0x2a;
  bytes[26] = width & 0xff;
  bytes[27] = (width >> 8) & 0x3f;
  bytes[28] = height & 0xff;
  bytes[29] = (height >> 8) & 0x3f;
  return bytes;
}

function buildWebpVp8L(width: number, height: number): Uint8Array {
  const payloadLen = 5;
  const bytes = buildWebpHeader("VP8L", payloadLen);
  bytes[20] = 0x2f; // signature
  const w = width - 1;
  const h = height - 1;
  bytes[21] = w & 0xff;
  bytes[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
  bytes[23] = (h >> 2) & 0xff;
  bytes[24] = (h >> 10) & 0x0f;
  return bytes;
}

function buildWebpVp8X(width: number, height: number): Uint8Array {
  const payloadLen = 10;
  const bytes = buildWebpHeader("VP8X", payloadLen);
  // bytes[20..23] flags + reserved
  const w = width - 1;
  const h = height - 1;
  bytes[24] = w & 0xff;
  bytes[25] = (w >> 8) & 0xff;
  bytes[26] = (w >> 16) & 0xff;
  bytes[27] = h & 0xff;
  bytes[28] = (h >> 8) & 0xff;
  bytes[29] = (h >> 16) & 0xff;
  return bytes;
}

interface AvifFixtureOptions {
  majorBrand?: string;
}

function buildAvif(
  width: number,
  height: number,
  opts: AvifFixtureOptions = {},
): Uint8Array {
  const majorBrand = opts.majorBrand ?? "avif";
  const ispe = makeBox(
    "ispe",
    concat([new Uint8Array(4), u32BE(width), u32BE(height)]),
  );
  const ipco = makeBox("ipco", ispe);
  const iprp = makeBox("iprp", ipco);
  const meta = makeBox(
    "meta",
    concat([new Uint8Array(4), iprp]), // FullBox version/flags + iprp
  );
  // ftyp: major_brand + minor_version + compatible_brands ("avif")
  const ftypPayload = concat([
    asciiBytes(majorBrand),
    u32BE(0),
    asciiBytes("avif"),
  ]);
  const ftyp = makeBox("ftyp", ftypPayload);
  return concat([ftyp, meta]);
}

function makeBox(type: string, payload: Uint8Array): Uint8Array {
  const size = 8 + payload.length;
  const bytes = new Uint8Array(size);
  new DataView(bytes.buffer).setUint32(0, size, false);
  bytes.set(asciiBytes(type), 4);
  bytes.set(payload, 8);
  return bytes;
}

function asciiBytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) bytes[i] = s.charCodeAt(i);
  return bytes;
}

function u32BE(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
