/**
 * Client-side Video Processor
 *
 * Processes videos before upload using mediabunny:
 * - Transcodes to H.264/AAC MP4 (universal playback)
 * - Resizes to max 1920px long edge / 1080px short edge
 * - Strips spurious rotation metadata from the output (mediabunny may
 *   bake rotation into pixels AND write a display matrix, causing the
 *   browser to double-rotate)
 * - Clears the alternate_group track flag (mediabunny sets it non-zero,
 *   which stops Safari's native video controls from auto-hiding)
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
import { normalizeDurationSeconds } from "../lib/video-playback.js";
import { zeroTrackAlternateGroups } from "../lib/mp4-track-flags.js";

/** Maximum pixels for the long edge of the output video. */
const MAX_LONG_EDGE = 1920;
/** Maximum pixels for the short edge of the output video. */
const MAX_SHORT_EDGE = 1080;
const POSTER_WIDTH = 640;
const BLURHASH_SIZE = 32;

export interface VideoProcessResult {
  file: File;
  width: number;
  height: number;
  durationSeconds?: number;
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
  rotation?: number;
  durationSeconds?: number;
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
    const rotation = videoTrack.rotation;

    const duration = await input.computeDuration();
    const durationSeconds = normalizeDurationSeconds(duration);
    const seekTime = Math.min(duration * 0.1, 3);

    const sink = new CanvasSink(videoTrack);
    const wrapped = await sink.getCanvas(seekTime);
    if (!wrapped) {
      return { sourceWidth, sourceHeight, rotation, durationSeconds };
    }

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

    return {
      poster,
      blurhash,
      sourceWidth,
      sourceHeight,
      rotation,
      durationSeconds,
    };
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
  const {
    poster,
    blurhash,
    sourceWidth,
    sourceHeight,
    rotation,
    durationSeconds,
  } = await extractPoster(file);

  // Compute output size from display dimensions (post-rotation).
  // Orientation-agnostic: long edge ≤ 1920, short edge ≤ 1080.
  let targetW = sourceWidth || MAX_LONG_EDGE;
  let targetH = sourceHeight || MAX_SHORT_EDGE;
  if (sourceWidth && sourceHeight) {
    const longSide = Math.max(sourceWidth, sourceHeight);
    const shortSide = Math.min(sourceWidth, sourceHeight);
    const scale = Math.min(
      MAX_LONG_EDGE / longSide,
      MAX_SHORT_EDGE / shortSide,
      1,
    );
    targetW = Math.round(sourceWidth * scale);
    targetH = Math.round(sourceHeight * scale);
  }
  // H.264 requires even dimensions
  targetW += targetW % 2;
  targetH += targetH % 2;

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
        width: targetW,
        height: targetH,
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

    // Mediabunny tags each track with a non-zero alternate_group, which makes
    // Safari treat tracks as mutually exclusive alternates and never auto-hide
    // the native <video> control bar during playback. Zero it so the controls
    // behave like any other MP4.
    zeroTrackAlternateGroups(buffer);

    // Detect whether this browser double-rotates.  Chrome's WebCodecs
    // bakes rotation into the pixel data AND mediabunny writes a display
    // matrix → the browser applies the matrix again (double-rotation).
    // Safari's WebCodecs does NOT bake rotation, so the matrix is needed.
    // Strategy: probe the output as-is; if the dimensions already match
    // the expected display size, leave the file alone.  Otherwise strip
    // the matrix and re-probe.
    const originalName = file.name.replace(/\.[^.]+$/, "");
    let mp4File = new File([buffer], `${originalName}.mp4`, {
      type: "video/mp4",
    });
    let actual = await probeVideoDimensions(mp4File);

    const dimsMatch =
      Math.abs(actual.width - targetW) <= 2 &&
      Math.abs(actual.height - targetH) <= 2;

    if (rotation && !dimsMatch) {
      resetMp4DisplayMatrix(buffer);
      mp4File = new File([buffer], `${originalName}.mp4`, {
        type: "video/mp4",
      });
      actual = await probeVideoDimensions(mp4File);
    }

    return {
      file: mp4File,
      width: actual.width,
      height: actual.height,
      durationSeconds,
      poster,
      blurhash,
    };
  } finally {
    input.dispose();
  }
}

// --- MP4 display matrix reset ---

/** Identity transformation matrix for tkhd (no rotation/scaling). */
const IDENTITY_MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];

/**
 * Walk the box tree of an MP4 file and invoke a callback for each box.
 * Recurses into standard ISO BMFF container boxes.
 */
function walkMp4Boxes(
  view: DataView,
  start: number,
  end: number,
  cb: (offset: number, size: number, type: string) => void,
): void {
  let pos = start;
  while (pos + 8 <= end) {
    let size = view.getUint32(pos);
    const type = String.fromCharCode(
      view.getUint8(pos + 4),
      view.getUint8(pos + 5),
      view.getUint8(pos + 6),
      view.getUint8(pos + 7),
    );

    if (size === 0) size = end - pos;
    if (size < 8 || pos + size > end) break;

    cb(pos, size, type);

    if (
      type === "moov" ||
      type === "trak" ||
      type === "mdia" ||
      type === "edts"
    )
      walkMp4Boxes(view, pos + 8, pos + size, cb);

    pos += size;
  }
}

/**
 * Reset the display matrix in all tkhd boxes to identity.
 * This removes rotation metadata while preserving the encoded pixel data
 * and the tkhd width/height (which match the encoded dimensions).
 * Operates in-place on the buffer.
 */
function resetMp4DisplayMatrix(buffer: ArrayBuffer): void {
  const view = new DataView(buffer);

  walkMp4Boxes(view, 0, buffer.byteLength, (boxOffset, _size, type) => {
    if (type !== "tkhd") return;

    const dataStart = boxOffset + 8; // past size + type
    const version = view.getUint8(dataStart);
    // Matrix offset from data start: version 0 → 40, version 1 → 52
    const matrixOff = dataStart + (version === 0 ? 40 : 52);

    if (matrixOff + 36 > buffer.byteLength) return;

    // Check if already identity — skip if so
    let isIdentity = true;
    for (let i = 0; i < 9; i++) {
      if (view.getInt32(matrixOff + i * 4) !== IDENTITY_MATRIX[i]) {
        isIdentity = false;
        break;
      }
    }
    if (isIdentity) return;

    // Reset to identity (no rotation)
    for (let i = 0; i < 9; i++) {
      view.setInt32(matrixOff + i * 4, IDENTITY_MATRIX[i]);
    }
  });
}

/**
 * Load a video file in a temporary `<video>` element and return the
 * browser-reported dimensions (which include any rotation metadata).
 */
function probeVideoDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to probe transcoded video dimensions"));
    };
    video.src = url;
  });
}

export const VideoProcessor = { isSupported, processToFile };
