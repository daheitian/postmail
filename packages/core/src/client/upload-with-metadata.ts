/**
 * Shared Upload Helper with Metadata
 *
 * Processes images via ImageProcessor, extracts dimensions + blurhash,
 * and uploads with metadata attached to the FormData.
 * Used by paste-image, image-node replace, and fullscreen compose.
 */

import { ImageProcessor } from "./image-processor.js";
import { extractImageMetadata } from "./media-metadata.js";

/**
 * Process an image file and upload it with dimension/blurhash metadata.
 *
 * @returns The server response with url and id
 */
export async function uploadWithMetadata(
  file: File,
): Promise<{ url: string; id: string }> {
  // Process image (resize, convert to WebP)
  const {
    file: processed,
    width,
    height,
  } = await ImageProcessor.processToFile(file);

  // Extract blurhash from the processed file
  let blurhash: string | undefined;
  try {
    const meta = await extractImageMetadata(processed);
    blurhash = meta.blurhash;
  } catch {
    // Blurhash extraction failed — upload without it
  }

  const formData = new FormData();
  formData.append("file", processed);
  formData.append("width", String(width));
  formData.append("height", String(height));
  if (blurhash) {
    formData.append("blurhash", blurhash);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return (await response.json()) as { url: string; id: string };
}
