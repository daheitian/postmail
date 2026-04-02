/**
 * Client-side Image Processor
 *
 * Processes images before upload:
 * - Resizes to max dimensions
 * - Strips all metadata (privacy)
 * - Converts to WebP format (JPEG fallback when WebP encoding is unavailable)
 *
 * EXIF orientation is handled automatically by the browser — modern
 * engines (Chrome 81+, Safari 13.1+, Firefox 93+) apply orientation
 * both in `<img>` rendering and in canvas `drawImage`.
 */

const DEFAULT_OPTIONS = {
  maxWidth: 1920,
  maxHeight: 1920,
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

/**
 * Calculate output dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
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
  const { width, height } = calculateDimensions(
    img.width,
    img.height,
    opts.maxWidth,
    opts.maxHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  // drawImage respects EXIF orientation — no manual rotation needed
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, opts.mimeType, opts.quality);

  return { blob, width, height };
}

/**
 * Process file and create a new File object
 */
async function processToFile(
  file: File,
  options: ProcessOptions = {},
): Promise<ProcessToFileResult> {
  const { blob, width, height } = await process(file, options);

  // Use actual blob type — Safari falls back to JPEG when WebP encoding isn't supported
  const EXT_MAP: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  const ext = EXT_MAP[blob.type] ?? "png";
  const originalName = file.name.replace(/\.[^.]+$/, "");
  const newName = `${originalName}.${ext}`;

  return {
    file: new File([blob], newName, { type: blob.type }),
    width,
    height,
  };
}

export const ImageProcessor = { process, processToFile };
