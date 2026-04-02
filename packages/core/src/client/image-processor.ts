/**
 * Client-side Image Processor
 *
 * Processes images before upload:
 * - Resizes to max dimensions
 * - Strips all metadata (privacy)
 * - Converts to WebP format
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

  // Export as WebP (falls back to PNG on browsers that don't support WebP encoding)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) {
          resolve(b);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      opts.mimeType,
      opts.quality,
    );
  });

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

  // Use actual blob type — Safari may fall back to PNG when WebP encoding isn't supported
  const ext = blob.type === "image/webp" ? "webp" : "png";
  const originalName = file.name.replace(/\.[^.]+$/, "");
  const newName = `${originalName}.${ext}`;

  return {
    file: new File([blob], newName, { type: blob.type }),
    width,
    height,
  };
}

export const ImageProcessor = { process, processToFile };
