/**
 * Shared Upload Helper with Metadata
 *
 * Processes images via ImageProcessor, extracts dimensions + blurhash,
 * and uploads with metadata attached to the FormData.
 * Used by paste-media, image-node replace, and inline compose editors.
 */

import { ImageProcessor } from "./image-processor.js";
import { extractImageMetadata } from "./media-metadata.js";
import { uploadViaSession } from "./upload-session.js";

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

  const result = await uploadViaSession(processed, {
    width,
    height,
    blurhash,
  });

  return {
    url: result.url,
    id: result.id,
  };
}
