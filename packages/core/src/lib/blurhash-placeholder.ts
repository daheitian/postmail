/**
 * Blurhash to Data URL (Workers-compatible)
 *
 * Decodes a blurhash to a tiny BMP image encoded as a base64 data URL.
 * Uses raw BMP encoding (no Canvas/DOM needed) so it works in
 * Cloudflare Workers and Node.js alike.
 *
 * The resulting 4×3 image is stretched by the browser via CSS
 * `background-size: cover` with `image-rendering: auto` (default),
 * which applies bilinear interpolation for a natural blur effect.
 */

import { decode } from "blurhash";

/**
 * Convert a blurhash string to a base64-encoded BMP data URL.
 *
 * @param hash - Blurhash string
 * @param width - Decode width in pixels (default 4)
 * @param height - Decode height in pixels (default 3)
 * @returns data:image/bmp;base64,... string
 *
 * @example
 * ```ts
 * const url = blurhashToDataUrl("LEHV6nWB2yk8pyo0adR*.7kCMdnj");
 * // "data:image/bmp;base64,Qk2..."
 * ```
 */
export function blurhashToDataUrl(hash: string, width = 4, height = 3): string {
  const pixels = decode(hash, width, height);
  const bmp = encodeBMP(pixels, width, height);
  return "data:image/bmp;base64," + uint8ToBase64(bmp);
}

/**
 * Encode RGBA pixel data into a BMP file (24-bit, bottom-up).
 */
function encodeBMP(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
): Uint8Array {
  // BMP row stride must be a multiple of 4 bytes
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const pixelDataSize = rowSize * h;
  const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (DIB header) + pixels

  const buf = new Uint8Array(fileSize);
  const view = new DataView(buf.buffer);

  // -- BMP File Header (14 bytes) --
  buf[0] = 0x42; // 'B'
  buf[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // pixel data offset

  // -- DIB Header (BITMAPINFOHEADER, 40 bytes) --
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, w, true); // width
  view.setInt32(22, h, true); // height (positive = bottom-up)
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // bits per pixel
  // compression (0), image size (0), resolution, colors — all zeros (default)

  // -- Pixel data (bottom-up, BGR) --
  for (let y = 0; y < h; y++) {
    const srcRow = (h - 1 - y) * w; // BMP is bottom-up
    const dstRow = 54 + y * rowSize;
    for (let x = 0; x < w; x++) {
      const srcIdx = (srcRow + x) * 4;
      const dstIdx = dstRow + x * 3;
      buf[dstIdx] = pixels[srcIdx + 2] ?? 0; // B
      buf[dstIdx + 1] = pixels[srcIdx + 1] ?? 0; // G
      buf[dstIdx + 2] = pixels[srcIdx] ?? 0; // R
    }
  }

  return buf;
}

/**
 * Base64-encode a Uint8Array without relying on btoa or Buffer.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i] as number;
    const b1 = i + 1 < len ? (bytes[i + 1] as number) : 0;
    const b2 = i + 2 < len ? (bytes[i + 2] as number) : 0;

    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < len ? chars[b2 & 63] : "=";
  }

  return result;
}
