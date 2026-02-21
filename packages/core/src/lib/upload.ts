/**
 * Upload Utilities
 *
 * Shared file validation and storage key generation for upload routes.
 */

import { uuidv7 } from "uuidv7";

/** MIME types allowed for upload */
const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

/** Maximum file size in bytes (10MB) */
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

/**
 * Validates an uploaded file's type and size.
 *
 * @param file - The uploaded File object
 * @returns null if valid, error message string if invalid
 * @example
 * ```ts
 * const error = validateUploadFile(file);
 * if (error) return dsToast(error, "error");
 * ```
 */
export function validateUploadFile(file: File): string | null {
  if (
    !ALLOWED_UPLOAD_TYPES.includes(
      file.type as (typeof ALLOWED_UPLOAD_TYPES)[number],
    )
  ) {
    return "File type not allowed.";
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return "File too large (max 10MB).";
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
