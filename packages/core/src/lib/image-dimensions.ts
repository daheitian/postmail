/**
 * Parse intrinsic pixel dimensions from a raw image header buffer.
 *
 * Used as a server-side fallback when an upload client does not provide
 * `width` / `height`. Only the file header is needed — typically the first
 * few hundred bytes for PNG/JPEG/GIF/WebP, and up to ~64 KB for AVIF where
 * the `ispe` property can be nested inside a larger `meta` box.
 *
 * Returns `null` when the bytes are too short, the format is unsupported,
 * or the header is malformed.
 *
 * @param mimeType MIME type the upload was declared as (e.g. `image/png`).
 * @param bytes Bytes from the start of the file. Pass at least
 *   {@link IMAGE_DIMENSION_PEEK_BYTES} for AVIF reliability; smaller is fine
 *   for other formats.
 */
export function parseImageDimensions(
  mimeType: string,
  bytes: Uint8Array,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  switch (mimeType) {
    case "image/png":
      return parsePng(view);
    case "image/jpeg":
    case "image/jpg":
      return parseJpeg(view);
    case "image/gif":
      return parseGif(view);
    case "image/webp":
      return parseWebp(view);
    case "image/avif":
      return parseIsoBmff(view, new Set(["avif", "avis"]));
    default:
      return null;
  }
}

/**
 * Recommended number of header bytes to feed into {@link parseImageDimensions}.
 *
 * Covers AVIF files with EXIF/ICC properties placed before the `ispe` box.
 * Smaller formats only inspect the first ~30 bytes.
 */
export const IMAGE_DIMENSION_PEEK_BYTES = 64 * 1024;

function readChars(view: DataView, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += String.fromCharCode(view.getUint8(offset + i));
  }
  return out;
}

function parsePng(view: DataView): { width: number; height: number } | null {
  if (view.byteLength < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i += 1) {
    if (view.getUint8(i) !== signature[i]) return null;
  }
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width === 0 || height === 0) return null;
  return { width, height };
}

function parseGif(view: DataView): { width: number; height: number } | null {
  if (view.byteLength < 10) return null;
  if (
    view.getUint8(0) !== 0x47 ||
    view.getUint8(1) !== 0x49 ||
    view.getUint8(2) !== 0x46
  ) {
    return null;
  }
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  if (width === 0 || height === 0) return null;
  return { width, height };
}

function parseWebp(view: DataView): { width: number; height: number } | null {
  if (view.byteLength < 16) return null;
  if (readChars(view, 0, 4) !== "RIFF") return null;
  if (readChars(view, 8, 4) !== "WEBP") return null;
  const chunk = readChars(view, 12, 4);

  if (chunk === "VP8 ") {
    if (view.byteLength < 30) return null;
    if (
      view.getUint8(23) !== 0x9d ||
      view.getUint8(24) !== 0x01 ||
      view.getUint8(25) !== 0x2a
    ) {
      return null;
    }
    const width = view.getUint16(26, true) & 0x3fff;
    const height = view.getUint16(28, true) & 0x3fff;
    if (width === 0 || height === 0) return null;
    return { width, height };
  }

  if (chunk === "VP8L") {
    if (view.byteLength < 25) return null;
    if (view.getUint8(20) !== 0x2f) return null;
    const b0 = view.getUint8(21);
    const b1 = view.getUint8(22);
    const b2 = view.getUint8(23);
    const b3 = view.getUint8(24);
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }

  if (chunk === "VP8X") {
    if (view.byteLength < 30) return null;
    const width =
      1 +
      (view.getUint8(24) |
        (view.getUint8(25) << 8) |
        (view.getUint8(26) << 16));
    const height =
      1 +
      (view.getUint8(27) |
        (view.getUint8(28) << 8) |
        (view.getUint8(29) << 16));
    return { width, height };
  }

  return null;
}

function parseJpeg(view: DataView): { width: number; height: number } | null {
  const length = view.byteLength;
  if (length < 4) return null;
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null;

  let i = 2;
  while (i < length) {
    while (i < length && view.getUint8(i) !== 0xff) i += 1;
    while (i < length && view.getUint8(i) === 0xff) i += 1;
    if (i >= length) return null;
    const marker = view.getUint8(i);
    i += 1;

    // Standalone markers without a payload length: 0x00 (escaped FF),
    // 0x01 (TEM), 0xD0–0xD9 (RSTn / SOI / EOI).
    if (marker === 0x00 || marker === 0x01) continue;
    if (marker >= 0xd0 && marker <= 0xd9) continue;

    if (i + 2 > length) return null;
    const segLen = view.getUint16(i, false);
    if (segLen < 2) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      // SOF payload: length(2) precision(1) height(2) width(2) components(1)
      if (i + 7 > length) return null;
      const height = view.getUint16(i + 3, false);
      const width = view.getUint16(i + 5, false);
      if (width === 0 || height === 0) return null;
      return { width, height };
    }

    i += segLen;
  }
  return null;
}

interface IsoBox {
  size: number;
  type: string;
  payloadOffset: number;
  end: number;
}

function readBox(view: DataView, pos: number): IsoBox | null {
  if (pos + 8 > view.byteLength) return null;
  let size = view.getUint32(pos, false);
  const type = readChars(view, pos + 4, 4);
  if (size === 1) {
    // 64-bit largesize: we don't bother — the dimension boxes we need fit in
    // the first 64 KB of any sane image.
    return null;
  }
  if (size === 0) {
    size = view.byteLength - pos;
  }
  if (size < 8) return null;
  return { size, type, payloadOffset: pos + 8, end: pos + size };
}

function findChild(
  view: DataView,
  start: number,
  end: number,
  type: string,
): IsoBox | null {
  let pos = start;
  while (pos < end) {
    const box = readBox(view, pos);
    if (!box) return null;
    if (box.type === type) return box;
    pos = box.end;
  }
  return null;
}

function parseIsoBmff(
  view: DataView,
  acceptedBrands: Set<string>,
): { width: number; height: number } | null {
  const ftyp = readBox(view, 0);
  if (!ftyp || ftyp.type !== "ftyp") return null;

  // major_brand at payloadOffset, minor_version at +4, compatible_brands from +8
  let isAccepted = false;
  if (ftyp.payloadOffset + 4 <= ftyp.end) {
    isAccepted = acceptedBrands.has(readChars(view, ftyp.payloadOffset, 4));
  }
  for (
    let q = ftyp.payloadOffset + 8;
    !isAccepted && q + 4 <= ftyp.end;
    q += 4
  ) {
    if (acceptedBrands.has(readChars(view, q, 4))) {
      isAccepted = true;
    }
  }
  if (!isAccepted) return null;

  const meta = findChild(view, ftyp.end, view.byteLength, "meta");
  if (!meta) return null;

  // meta is a FullBox: skip the 4-byte version/flags before its children.
  const iprp = findChild(view, meta.payloadOffset + 4, meta.end, "iprp");
  if (!iprp) return null;

  const ipco = findChild(view, iprp.payloadOffset, iprp.end, "ipco");
  if (!ipco) return null;

  // The first ispe inside ipco describes the primary image.
  const ispe = findChild(view, ipco.payloadOffset, ipco.end, "ispe");
  if (!ispe) return null;

  // ispe is a FullBox: version(1) flags(3) width(4) height(4)
  const widthOffset = ispe.payloadOffset + 4;
  if (widthOffset + 8 > view.byteLength) return null;
  const width = view.getUint32(widthOffset, false);
  const height = view.getUint32(widthOffset + 4, false);
  if (width === 0 || height === 0) return null;
  return { width, height };
}
