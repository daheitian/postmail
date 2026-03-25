/**
 * Upload Utilities
 *
 * Shared file validation and storage key generation for upload routes.
 */

import type { MediaKind } from "../types/constants.js";
import { createEntityId } from "./ids.js";

const MEDIA_ROOT_PREFIX = "media";
const MEDIA_FILES_STORAGE_PREFIX = "files";
const MEDIA_POSTERS_STORAGE_PREFIX = "posters";
const MEDIA_ASSET_STORAGE_PREFIX = "assets";

/** MIME types — images */
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/x-icon",
] as const;

/** MIME types — video */
const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "video/3gpp",
  "video/x-flv",
  "video/ogg",
] as const;

/** MIME types — audio */
const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/aac",
  "audio/webm",
  "audio/x-aiff",
  "audio/opus",
  "audio/3gpp",
  "audio/midi",
] as const;

/** MIME types — documents (books, PDFs) */
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/epub+zip",
  "application/x-mobipocket-ebook",
  "application/vnd.amazon.ebook",
] as const;

/** MIME types — office documents */
const OFFICE_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.apple.pages",
  "application/vnd.apple.numbers",
  "application/vnd.apple.keynote",
] as const;

/** MIME types — text & structured data */
const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/x-tiptap+json",
  "text/html",
  "text/css",
  "text/javascript",
  "text/xml",
  "text/rtf",
  "text/tab-separated-values",
  "text/calendar",
  "application/json",
  "application/xml",
  "application/yaml",
  "application/toml",
] as const;

/** MIME types — archives */
const ARCHIVE_MIME_TYPES = [
  "application/zip",
  "application/x-tar",
  "application/gzip",
  "application/x-bzip2",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/zstd",
] as const;

/** MIME types — fonts */
const FONT_MIME_TYPES = [
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
] as const;

/** MIME types — 3D & design */
const THREE_D_MIME_TYPES = [
  "model/gltf+json",
  "model/gltf-binary",
  "model/obj",
  "application/x-figma",
  "image/vnd.dxf",
] as const;

/** MIME types — data & code */
const CODE_MIME_TYPES = [
  "application/sql",
  "application/wasm",
  "application/x-ipynb+json",
  "application/x-sh",
  "application/x-python-code",
] as const;

/** Lookup table from MIME type to category */
const MIME_CATEGORY_MAP = new Map<string, MediaCategory>([
  ...IMAGE_MIME_TYPES.map((t) => [t, "image" as const] as const),
  ...VIDEO_MIME_TYPES.map((t) => [t, "video" as const] as const),
  ...AUDIO_MIME_TYPES.map((t) => [t, "audio" as const] as const),
  ...DOCUMENT_MIME_TYPES.map((t) => [t, "document" as const] as const),
  ...OFFICE_MIME_TYPES.map((t) => [t, "office" as const] as const),
  ...TEXT_MIME_TYPES.map((t) => [t, "text" as const] as const),
  ...ARCHIVE_MIME_TYPES.map((t) => [t, "archive" as const] as const),
  ...FONT_MIME_TYPES.map((t) => [t, "font" as const] as const),
  ...THREE_D_MIME_TYPES.map((t) => [t, "3d" as const] as const),
  ...CODE_MIME_TYPES.map((t) => [t, "code" as const] as const),
]);

/**
 * Accept string for file inputs. Accepts all file types.
 *
 * @example
 * ```ts
 * <input type="file" accept={UPLOAD_ACCEPT} />
 * ```
 */
export const UPLOAD_ACCEPT = "*/*";

export type MediaCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "office"
  | "text"
  | "archive"
  | "font"
  | "3d"
  | "code";

export type UploadContentDisposition = "inline" | "attachment";

export interface StoredUploadPolicy {
  contentDisposition: UploadContentDisposition;
  mediaKind: MediaKind;
  requiresSignatureCheck: boolean;
}

const ATTACHMENT_ONLY_MIME_TYPES = new Set([
  "text/html",
  "text/javascript",
  "application/javascript",
]);

const INLINE_SIGNATURE_MIME_TYPES = new Set([
  "image/webp",
  "video/mp4",
  "audio/mp4",
  "application/pdf",
]);

/**
 * Returns the media category for a given MIME type.
 * Unrecognized types default to "archive".
 *
 * @param mimeType - The MIME type to classify
 * @returns The media category
 * @example
 * ```ts
 * getMediaCategory("video/mp4"); // "video"
 * getMediaCategory("text/plain"); // "text"
 * getMediaCategory("application/octet-stream"); // "archive"
 * ```
 */
export function getMediaCategory(mimeType: string): MediaCategory {
  // Exact match from known types
  const exact = MIME_CATEGORY_MAP.get(mimeType);
  if (exact) return exact;

  // Prefix-based fallback for unknown subtypes
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("font/")) return "font";
  if (mimeType.startsWith("model/")) return "3d";
  if (mimeType.startsWith("text/")) return "text";

  // Unknown types default to archive
  return "archive";
}

/**
 * Maps a MIME type to one of the five media kind categories.
 * image/video/audio/text pass through; everything else becomes "document".
 *
 * @param mimeType - The MIME type to classify
 * @returns The media kind
 * @example
 * ```ts
 * toMediaKind("image/jpeg"); // "image"
 * toMediaKind("application/pdf"); // "document"
 * toMediaKind("text/plain"); // "text"
 * ```
 */
export function toMediaKind(mimeType: string): MediaKind {
  const category = getMediaCategory(mimeType);
  switch (category) {
    case "image":
    case "video":
    case "audio":
    case "text":
      return category;
    default:
      return "document";
  }
}

/**
 * Returns true if the given MIME type is an image type.
 *
 * @param mimeType - The MIME type to check
 * @returns Whether the MIME type is an image
 * @example
 * ```ts
 * isImageMimeType("image/jpeg"); // true
 * isImageMimeType("video/mp4"); // false
 * ```
 */
export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export interface ValidateUploadOptions {
  /** When true, only image MIME types are accepted (e.g. for avatar uploads). */
  imagesOnly?: boolean;
  /** Max file size in MB. */
  maxFileSizeMB: number;
}

/**
 * Validates an uploaded file's type and size.
 *
 * @param file - The uploaded File object
 * @param options - Validation constraints
 * @returns null if valid, error message string if invalid
 * @example
 * ```ts
 * const error = validateUploadFile(file, { maxFileSizeMB: 500 });
 * if (error) return dsToast(error, "error");
 * ```
 */
export function validateUploadFile(
  file: File,
  options: ValidateUploadOptions,
): string | null {
  return validateUploadFileMetadata(file.type, file.size, options);
}

/**
 * Validates file metadata (type and size) without requiring a File object.
 * Used by the multipart upload initiation endpoint which receives JSON metadata.
 * All MIME types are accepted; unrecognized types are categorized as archive.
 *
 * @param contentType - The MIME type of the file
 * @param size - The file size in bytes
 * @param options - Validation constraints
 * @returns null if valid, error message string if invalid
 * @example
 * ```ts
 * const error = validateUploadFileMetadata("image/jpeg", 1024000, { maxFileSizeMB: 500 });
 * ```
 */
export function validateUploadFileMetadata(
  contentType: string,
  size: number,
  options: ValidateUploadOptions,
): string | null {
  if (options?.imagesOnly) {
    if (!isImageMimeType(contentType)) {
      return "File type not allowed.";
    }
  }
  const maxMB = options.maxFileSizeMB;
  if (size > maxMB * 1024 * 1024) {
    return `File too large (max ${maxMB}MB).`;
  }
  return null;
}

/**
 * Resolve the serving policy for an uploaded object after client-side
 * processing has already produced the final file.
 *
 * Image, video, and audio uploads are intentionally strict in v1 so the
 * backend only accepts the concrete formats Jant knows how to serve today.
 * Non-preview documents remain broadly allowed and default to attachment
 * delivery, except PDFs which stay inline so browsers can render them.
 */
export function getStoredUploadPolicy(
  contentType: string,
): StoredUploadPolicy | null {
  if (contentType.startsWith("image/")) {
    if (contentType !== "image/webp") return null;
    return {
      contentDisposition: "inline",
      mediaKind: "image",
      requiresSignatureCheck: true,
    };
  }

  if (contentType.startsWith("video/")) {
    if (contentType !== "video/mp4") return null;
    return {
      contentDisposition: "inline",
      mediaKind: "video",
      requiresSignatureCheck: true,
    };
  }

  if (contentType.startsWith("audio/")) {
    if (contentType !== "audio/mp4") return null;
    return {
      contentDisposition: "inline",
      mediaKind: "audio",
      requiresSignatureCheck: true,
    };
  }

  if (contentType === "application/pdf") {
    return {
      contentDisposition: "inline",
      mediaKind: "document",
      requiresSignatureCheck: true,
    };
  }

  if (ATTACHMENT_ONLY_MIME_TYPES.has(contentType)) {
    return {
      contentDisposition: "attachment",
      mediaKind: "text",
      requiresSignatureCheck: false,
    };
  }

  return {
    contentDisposition: "attachment",
    mediaKind: toMediaKind(contentType),
    requiresSignatureCheck: false,
  };
}

export function validateStoredUploadMetadata(
  contentType: string,
  size: number,
  options: ValidateUploadOptions,
): string | null {
  const basicError = validateUploadFileMetadata(contentType, size, options);
  if (basicError) {
    return basicError;
  }

  if (!getStoredUploadPolicy(contentType)) {
    return `File type "${contentType}" is not supported.`;
  }

  return null;
}

export function getStoredUploadSignaturePeekLength(
  contentType: string,
): number {
  return INLINE_SIGNATURE_MIME_TYPES.has(contentType) ? 64 : 0;
}

export function validateStoredUploadSignature(
  contentType: string,
  bytes: Uint8Array,
): string | null {
  switch (contentType) {
    case "image/webp":
      return bytes.length >= 12 &&
        readAscii(bytes, 0, 4) === "RIFF" &&
        readAscii(bytes, 8, 4) === "WEBP"
        ? null
        : "Only WebP images are supported.";
    case "video/mp4":
    case "audio/mp4":
      return bytes.length >= 12 && readAscii(bytes, 4, 4) === "ftyp"
        ? null
        : "Only MP4 uploads are supported.";
    case "application/pdf":
      return bytes.length >= 5 && readAscii(bytes, 0, 5) === "%PDF-"
        ? null
        : "Only PDF documents are supported.";
    default:
      return null;
  }
}

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return new TextDecoder("ascii").decode(bytes.slice(start, start + length));
}

/**
 * Generates a unique storage key for an uploaded media object.
 * Format: `media/{siteId}/files/{typeid}.{ext}`
 *
 * @param siteId - Owning site ID
 * @param originalFilename - Original filename to extract extension from
 * @returns Object with generated id, filename, and storageKey
 * @example
 * ```ts
 * const { id, filename, storageKey } = generateStorageKey("sit_...", "photo.jpg");
 * // { id: "med_...", filename: "med_....jpg", storageKey: "media/sit_.../files/med_....jpg" }
 * ```
 */
export function generateStorageKey(
  siteId: string,
  originalFilename: string,
): {
  id: string;
  filename: string;
  storageKey: string;
} {
  const ext = originalFilename.split(".").pop() || "bin";
  const id = createEntityId("media");
  return generateStorageKeyForId(siteId, id, ext);
}

export function generateStorageKeyForId(
  siteId: string,
  mediaId: string,
  originalFilenameOrExtension: string,
): {
  id: string;
  filename: string;
  storageKey: string;
} {
  const ext = originalFilenameOrExtension.includes(".")
    ? originalFilenameOrExtension.split(".").pop() || "bin"
    : originalFilenameOrExtension;
  const filename = `${mediaId}.${ext}`;
  const storageKey = [
    MEDIA_ROOT_PREFIX,
    siteId,
    MEDIA_FILES_STORAGE_PREFIX,
    filename,
  ].join("/");
  return { id: mediaId, filename, storageKey };
}

export function generateSiteAssetStorageKey(
  siteId: string,
  assetKind: "avatar" | "favicon",
  originalFilename: string,
): {
  id: string;
  filename: string;
  storageKey: string;
} {
  const ext = originalFilename.split(".").pop() || "bin";
  const id = createEntityId("media");
  const filename = `${id}.${ext}`;
  const storageKey = getSiteStorageKey(siteId, assetKind, filename);
  return { id, filename, storageKey };
}

export function getPosterStorageKey(siteId: string, mediaId: string): string {
  return `${MEDIA_ROOT_PREFIX}/${siteId}/${MEDIA_POSTERS_STORAGE_PREFIX}/${mediaId}.webp`;
}

export function getTemporaryUploadStorageKey(
  siteId: string,
  uploadSessionId: string,
  originalFilename: string,
): string {
  const ext = originalFilename.split(".").pop() || "bin";
  return `${MEDIA_ROOT_PREFIX}/${siteId}/tmp/${uploadSessionId}/source.${ext}`;
}

export function getTemporaryPosterStorageKey(
  siteId: string,
  uploadSessionId: string,
): string {
  return `${MEDIA_ROOT_PREFIX}/${siteId}/tmp/${uploadSessionId}/poster.webp`;
}

export function getSiteStorageKey(
  siteId: string,
  assetKind: "avatar" | "favicon",
  filename: string,
): string {
  return `${MEDIA_ROOT_PREFIX}/${siteId}/${MEDIA_ASSET_STORAGE_PREFIX}/${assetKind}/${filename}`;
}
