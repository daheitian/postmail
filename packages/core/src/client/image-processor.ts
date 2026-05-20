/**
 * Client-side Image Processor
 *
 * Processes images before upload:
 * - Resizes oversized images (caps the short side; the long side rides free)
 * - Strips all metadata (privacy)
 * - Converts to WebP format (JPEG fallback when WebP encoding is unavailable)
 *
 * EXIF orientation is handled automatically by the browser — modern
 * engines (Chrome 81+, Safari 13.1+, Firefox 93+) apply orientation
 * both in `<img>` rendering and in canvas `drawImage`.
 *
 * Long and wide screenshots (chat logs, articles, wide tables) lose their
 * text legibility if the short side is scaled down, so the resize step caps
 * only the *short* side and leaves the long side alone. Images whose long
 * side exceeds the safe canvas limit can't be redrawn at all — those upload
 * untouched, so images of any length are supported.
 */

/** Cap for the shorter image side — the side that determines text sharpness. */
const MAX_SHORT_SIDE = 1920;

/**
 * Largest long side we can still redraw on a canvas. A canvas bounded by
 * MAX_SHORT_SIDE × MAX_LONG_SIDE (1920 × 8192 ≈ 15.7M px) stays under the
 * ~16.7M-pixel area limit older mobile Safari enforces. Anything longer
 * can't be re-encoded, so it uploads as-is.
 */
const MAX_LONG_SIDE = 8192;

const DEFAULT_OPTIONS = {
  maxShortSide: MAX_SHORT_SIDE,
  maxLongSide: MAX_LONG_SIDE,
  quality: 0.85,
  mimeType: "image/webp" as const,
};

type ProcessOptions = Partial<typeof DEFAULT_OPTIONS>;

/**
 * Load image from file
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export interface ImageProcessPlan {
  /** When true, upload the original file untouched (too large to re-encode). */
  passthrough: boolean;
  /** Target dimensions — equal to the source dimensions when `passthrough`. */
  width: number;
  height: number;
}

/**
 * Decide how to handle an image given its source dimensions.
 *
 * - Long side over `maxLongSide` → `passthrough` (canvas can't redraw it).
 * - Short side within `maxShortSide` → keep dimensions, just re-encode.
 * - Otherwise → scale down so the short side hits `maxShortSide`.
 *
 * @param sourceWidth - Natural image width in pixels
 * @param sourceHeight - Natural image height in pixels
 * @param options - `maxShortSide` and `maxLongSide` caps
 * @returns The processing plan
 *
 * @example
 * ```ts
 * planImageProcessing(1080, 6000, { maxShortSide: 1920, maxLongSide: 8192 });
 * // { passthrough: false, width: 1080, height: 6000 }
 * ```
 */
export function planImageProcessing(
  sourceWidth: number,
  sourceHeight: number,
  options: { maxShortSide: number; maxLongSide: number },
): ImageProcessPlan {
  const longSide = Math.max(sourceWidth, sourceHeight);
  if (longSide > options.maxLongSide) {
    return { passthrough: true, width: sourceWidth, height: sourceHeight };
  }

  const shortSide = Math.min(sourceWidth, sourceHeight);
  if (shortSide <= options.maxShortSide) {
    return { passthrough: false, width: sourceWidth, height: sourceHeight };
  }

  const scale = options.maxShortSide / shortSide;
  return {
    passthrough: false,
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
  };
}

/**
 * Convert canvas to Blob, falling back to JPEG when the requested format
 * (typically WebP) is not supported by the browser (e.g. Safari).
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      mimeType,
      quality,
    );
  });

  // Browser silently falls back to PNG when it can't encode the requested
  // format. PNG ignores the quality parameter, producing oversized files.
  // Re-encode as JPEG instead so lossy compression still applies.
  if (mimeType !== "image/png" && blob.type === "image/png") {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
        "image/jpeg",
        quality,
      );
    });
  }

  return blob;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
  /** False when `blob` is the untouched original (too large to re-encode). */
  processed: boolean;
}

export interface ProcessToFileResult {
  file: File;
  width: number;
  height: number;
}

/**
 * Process image file
 */
async function process(
  file: File,
  options: ProcessOptions = {},
): Promise<ProcessResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const img = await loadImage(file);

  // img.width / img.height already reflect EXIF orientation in modern browsers
  const plan = planImageProcessing(img.width, img.height, opts);

  // Too large to redraw on a canvas without crushing detail — keep the
  // original bytes so images of any length upload at full quality.
  if (plan.passthrough) {
    return {
      blob: file,
      width: plan.width,
      height: plan.height,
      processed: false,
    };
  }

  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // drawImage respects EXIF orientation — no manual rotation needed
  ctx.drawImage(img, 0, 0, plan.width, plan.height);

  const blob = await canvasToBlob(canvas, opts.mimeType, opts.quality);

  return { blob, width: plan.width, height: plan.height, processed: true };
}

/**
 * Process file and create a new File object
 */
async function processToFile(
  file: File,
  options: ProcessOptions = {},
): Promise<ProcessToFileResult> {
  const result = await process(file, options);

  // Original kept untouched — upload the file as-is.
  if (!result.processed) {
    return { file, width: result.width, height: result.height };
  }

  // Use actual blob type — Safari falls back to JPEG when WebP encoding isn't supported
  const EXT_MAP: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const ext = EXT_MAP[result.blob.type] ?? "png";
  const originalName = file.name.replace(/\.[^.]+$/, "");
  const newName = `${originalName}.${ext}`;

  return {
    file: new File([result.blob], newName, { type: result.blob.type }),
    width: result.width,
    height: result.height,
  };
}

export const ImageProcessor = { process, processToFile };
