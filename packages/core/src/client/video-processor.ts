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
 * Extract a poster frame and compute its blurhash from a video file.
 * Seeks to `min(duration × 0.1, 3s)` and captures the frame.
 *
 * @param file - Source video file
 * @returns Poster blob (640px-wide WebP) and blurhash string, or empty on failure
 */
async function extractPoster(
  file: File,
): Promise<{ poster?: Blob; blurhash?: string }> {
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return {};

    const duration = await input.computeDuration();
    const seekTime = Math.min(duration * 0.1, 3);

    const sink = new CanvasSink(videoTrack);
    const wrapped = await sink.getCanvas(seekTime);
    if (!wrapped) return {};

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
    if (!pCtx) return {};
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
    if (!bhCtx) return { poster };
    bhCtx.drawImage(canvas, 0, 0, bw, bh);

    const imageData = bhCtx.getImageData(0, 0, bw, bh);
    const blurhash = encode(imageData.data, bw, bh, 4, 3);

    return { poster, blurhash };
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
  // Extract poster + blurhash first (separate Input instance)
  const { poster, blurhash } = await extractPoster(file);

  // Transcode to MP4 H.264/AAC
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
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
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

    // Determine output dimensions from video track
    const videoTrack = await input.getPrimaryVideoTrack();
    let width = MAX_WIDTH;
    let height = MAX_HEIGHT;
    if (videoTrack) {
      const srcW = videoTrack.displayWidth;
      const srcH = videoTrack.displayHeight;
      const scale = Math.min(MAX_WIDTH / srcW, MAX_HEIGHT / srcH, 1);
      width = Math.round(srcW * scale);
      height = Math.round(srcH * scale);
    }

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
