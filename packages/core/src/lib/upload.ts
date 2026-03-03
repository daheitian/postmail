/**
 * Upload Utilities
 *
 * Shared file validation and storage key generation for upload routes.
 */

import { uuidv7 } from "uuidv7";

/** MIME types allowed for upload — images */
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

/** MIME types allowed for upload — video */
const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

/** MIME types allowed for upload — audio */
const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
] as const;

/** MIME types allowed for upload — documents */
const DOCUMENT_MIME_TYPES = ["application/pdf"] as const;

/** MIME types allowed for upload — text */
const TEXT_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/x-tiptap+json",
] as const;

/** All allowed MIME types */
const ALLOWED_UPLOAD_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
  ...TEXT_MIME_TYPES,
] as const;

/**
 * Accept string for file inputs, covering all allowed upload types.
 *
 * @example
 * ```ts
 * <input type="file" accept={UPLOAD_ACCEPT} />
 * ```
 */
export const UPLOAD_ACCEPT = (ALLOWED_UPLOAD_TYPES as readonly string[]).join(
  ",",
);

export type MediaCategory = "image" | "video" | "audio" | "document" | "text";

/**
 * Returns the media category for a given MIME type.
 *
 * @param mimeType - The MIME type to classify
 * @returns The media category, or null if the MIME type is not supported
 * @example
 * ```ts
 * getMediaCategory("video/mp4"); // "video"
 * getMediaCategory("text/plain"); // "text"
 * ```
 */
export function getMediaCategory(mimeType: string): MediaCategory | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "document";
  if (
    mimeType === "text/plain" ||
    mimeType === "text/markdown" ||
    mimeType === "text/x-tiptap+json"
  )
    return "text";
  return null;
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
  } else if (
    !ALLOWED_UPLOAD_TYPES.includes(
      contentType as (typeof ALLOWED_UPLOAD_TYPES)[number],
    )
  ) {
    return "File type not allowed.";
  }
  const maxMB = options.maxFileSizeMB;
  if (size > maxMB * 1024 * 1024) {
    return `File too large (max ${maxMB}MB).`;
  }
  return null;
}

/**
 * Generates a unique storage key for an uploaded file.
 * Format: `media/YYYY/MM/uuid.ext`
 *
 * @param originalFilename - Original filename to extract extension from
 * @returns Object with generated id, filename, and storageKey
 * @example
 * ```ts
 * const { id, filename, storageKey } = generateStorageKey("photo.jpg");
 * // { id: "0192...", filename: "0192....jpg", storageKey: "media/2025/01/0192....jpg" }
 * ```
 */
export function generateStorageKey(originalFilename: string): {
  id: string;
  filename: string;
  storageKey: string;
} {
  const ext = originalFilename.split(".").pop() || "bin";
  const id = uuidv7();
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const filename = `${id}.${ext}`;
  const storageKey = `media/${year}/${month}/${filename}`;
  return { id, filename, storageKey };
}
