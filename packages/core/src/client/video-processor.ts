/**
 * Client-side Video Processor
 *
 * Processes videos before upload using mediabunny:
 * - Transcodes to H.264/AAC MP4 (universal playback)
 * - Resizes to max 1920×1080
 * - Extracts poster frame + blurhash during processing
 *
 * Requires WebCodecs API support — check `isSupported()` before use.
 */

import {
  Input,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  BlobSource,
  CanvasSink,
  Conversion,
  QUALITY_HIGH,
  ALL_FORMATS,
} from "mediabunny";
import { encode } from "blurhash";

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const POSTER_WIDTH = 640;
const BLURHASH_SIZE = 32;

export interface VideoProcessResult {
  file: File;
  width: number;
  height: number;
  poster?: Blob;
  blurhash?: string;
}

/**
 * Check if the browser supports WebCodecs-based video processing.
 *
 * @returns `true` if `VideoEncoder` is available in the current environment
 */
function isSupported(): boolean {
  return typeof VideoEncoder !== "undefined";
}

/**
 * Extract a poster frame, blurhash, and source dimensions from a video file.
 * Seeks to `min(duration × 0.1, 3s)` and captures the frame.
 * Also returns the original video dimensions so the caller can compute
 * the correct output size without opening a second Input instance.
 *
 * @param file - Source video file
 * @returns Poster blob (640px-wide WebP), blurhash string, and source dimensions
 */
async function extractPoster(file: File): Promise<{
  poster?: Blob;
  blurhash?: string;
  sourceWidth?: number;
  sourceHeight?: number;
}> {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return {};

    const sourceWidth = videoTrack.displayWidth;
    const sourceHeight = videoTrack.displayHeight;

    const duration = await input.computeDuration();
    const seekTime = Math.min(duration * 0.1, 3);

    const sink = new CanvasSink(videoTrack);
    const wrapped = await sink.getCanvas(seekTime);
    if (!wrapped) return { sourceWidth, sourceHeight };

    const canvas = wrapped.canvas as HTMLCanvasElement;

    // Poster: 640px wide WebP
    const srcW = canvas.width;
    const srcH = canvas.height;
    const posterScale = Math.min(POSTER_WIDTH / srcW, 1);
    const pw = Math.round(srcW * posterScale);
    const ph = Math.round(srcH * posterScale);

    const posterCanvas = document.createElement("canvas");
    posterCanvas.width = pw;
    posterCanvas.height = ph;
    const pCtx = posterCanvas.getContext("2d");
    if (!pCtx) return { sourceWidth, sourceHeight };
    pCtx.drawImage(canvas, 0, 0, pw, ph);

    const poster = await new Promise<Blob | undefined>((resolve) => {
      posterCanvas.toBlob(
        (blob) => resolve(blob ?? undefined),
        "image/webp",
        0.8,
      );
    });

    // Blurhash: 32px canvas, 4×3 components
    const bhScale = Math.min(BLURHASH_SIZE / srcW, BLURHASH_SIZE / srcH, 1);
    const bw = Math.max(Math.round(srcW * bhScale), 1);
    const bh = Math.max(Math.round(srcH * bhScale), 1);

    const bhCanvas = document.createElement("canvas");
    bhCanvas.width = bw;
    bhCanvas.height = bh;
    const bhCtx = bhCanvas.getContext("2d");
    if (!bhCtx) return { poster, sourceWidth, sourceHeight };
    bhCtx.drawImage(canvas, 0, 0, bw, bh);

    const imageData = bhCtx.getImageData(0, 0, bw, bh);
    const blurhash = encode(imageData.data, bw, bh, 4, 3);

    return { poster, blurhash, sourceWidth, sourceHeight };
  } catch {
    return {};
  } finally {
    input.dispose();
  }
}

/**
 * Process a video file: transcode to H.264/AAC MP4, resize to fit within
 * 1920×1080, and extract poster frame + blurhash.
 *
 * @param file - Source video file
 * @param onProgress - Optional callback receiving progress from 0 to 1
 * @returns Processed MP4 file with dimensions, poster, and blurhash
 */
async function processToFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<VideoProcessResult> {
  // Extract poster + blurhash + source dimensions (separate Input instance,
  // so the transcoding Input below starts with clean demuxer state).
  const { poster, blurhash, sourceWidth, sourceHeight } =
    await extractPoster(file);

  // Compute output size preserving the original aspect ratio
  let width = MAX_WIDTH;
  let height = MAX_HEIGHT;
  if (sourceWidth && sourceHeight) {
    const scale = Math.min(
      MAX_WIDTH / sourceWidth,
      MAX_HEIGHT / sourceHeight,
      1,
    );
    width = Math.round(sourceWidth * scale);
    height = Math.round(sourceHeight * scale);
  }
  // H.264 requires even dimensions
  width += width % 2;
  height += height % 2;

  // Transcode to MP4 H.264/AAC (fresh Input — not shared with extractPoster)
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  try {
    const conversion = await Conversion.init({
      input,
      output,
      video: {
        codec: "avc",
        width,
        height,
        fit: "contain",
        bitrate: QUALITY_HIGH,
      },
      audio: {
        codec: "aac",
      },
    });

    if (onProgress) {
      conversion.onProgress = onProgress;
    }

    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer) throw new Error("Video processing produced no output");

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const mp4File = new File([buffer], `${originalName}.mp4`, {
      type: "video/mp4",
    });

    return { file: mp4File, width, height, poster, blurhash };
  } finally {
    input.dispose();
  }
}

export const VideoProcessor = { isSupported, processToFile };
