/**
 * Client-side Media Metadata Extraction
 *
 * Extracts dimensions and blurhash from image/video files using
 * Canvas API and the blurhash library.
 */

import { encode } from "blurhash";

export interface MediaMetadata {
  width?: number;
  height?: number;
  blurhash?: string;
  waveform?: string;
  poster?: Blob;
}

/**
 * Extract metadata (width, height, blurhash) from an image file.
 * Uses a small canvas (max 32px) for blurhash computation.
 */
export async function extractImageMetadata(
  file: File,
): Promise<{ width: number; height: number; blurhash: string }> {
  const img = await loadImage(file);
  const { width, height } = img;

  // Scale down for blurhash — max 32px on the longest side
  const scale = Math.min(32 / width, 32 / height, 1);
  const bw = Math.max(Math.round(width * scale), 1);
  const bh = Math.max(Math.round(height * scale), 1);

  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(img, 0, 0, bw, bh);

  const imageData = ctx.getImageData(0, 0, bw, bh);
  const blurhash = encode(imageData.data, bw, bh, 4, 3);

  return { width, height, blurhash };
}

/**
 * Extract metadata from a video file.
 * Loads the video to get dimensions, then seeks to `min(duration * 0.1, 3)` and
 * captures a frame for blurhash (32px canvas) and a poster image (640px WebP).
 * Uses an 8s timeout — returns only dimensions if capture times out.
 */
export async function extractVideoMetadata(file: File): Promise<{
  width: number;
  height: number;
  blurhash?: string;
  poster?: Blob;
}> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";

    // Wait for metadata to load (includes duration)
    const { width, height, duration } = await new Promise<{
      width: number;
      height: number;
      duration: number;
    }>((resolve, reject) => {
      video.onloadedmetadata = () =>
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
        });
      video.onerror = () => reject(new Error("Failed to load video metadata"));
      video.src = url;
    });

    // Try to capture frame for blurhash + poster (8s timeout)
    let blurhash: string | undefined;
    let poster: Blob | undefined;
    try {
      const seekTime = Math.min(duration * 0.1, 3);
      const result = await Promise.race([
        captureVideoFrameAndPoster(video, width, height, seekTime),
        timeout(8000),
      ]);
      blurhash = result.blurhash;
      poster = result.poster;
    } catch {
      // Timeout or capture failed — return dimensions only
    }

    return { width, height, blurhash, poster };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Extract waveform peak amplitudes from an audio file.
 * Decodes via Web Audio API and returns a JSON string of ~100 normalized peak values (0–1).
 *
 * @param file - Audio file to extract peaks from
 * @returns JSON string of peak values, e.g. "[0.2,0.8,0.5,...]"
 */
export async function extractAudioWaveform(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();

  try {
    const decoded = await audioCtx.decodeAudioData(buffer);
    const raw = decoded.getChannelData(0);
    const count = 100;
    const step = Math.max(1, Math.floor(raw.length / count));
    const peaks: number[] = new Array(count);

    for (let i = 0; i < count; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(start + step, raw.length);
      for (let j = start; j < end; j++) {
        const v = Math.abs(raw[j]);
        if (v > max) max = v;
      }
      peaks[i] = max;
    }

    let maxPeak = 0;
    for (const p of peaks) if (p > maxPeak) maxPeak = p;
    if (maxPeak > 0) {
      for (let i = 0; i < count; i++)
        peaks[i] = Math.round((peaks[i] / maxPeak) * 100) / 100;
    }

    return JSON.stringify(peaks);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Extract metadata from any media file based on MIME type.
 */
export async function extractMediaMetadata(file: File): Promise<MediaMetadata> {
  try {
    if (file.type.startsWith("image/")) {
      return await extractImageMetadata(file);
    }
    if (file.type.startsWith("video/")) {
      const result = await extractVideoMetadata(file);
      return {
        width: result.width,
        height: result.height,
        blurhash: result.blurhash,
        poster: result.poster,
      };
    }
    if (file.type.startsWith("audio/")) {
      const waveform = await extractAudioWaveform(file);
      return { waveform };
    }
  } catch {
    // Extraction failed — return empty metadata
  }
  return {};
}

// --- Helpers ---

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

function captureVideoFrameAndPoster(
  video: HTMLVideoElement,
  width: number,
  height: number,
  seekTime: number,
): Promise<{ blurhash: string; poster?: Blob }> {
  return new Promise((resolve, reject) => {
    video.currentTime = seekTime;
    video.onseeked = () => {
      try {
        // Blurhash: small 32px canvas
        const scale = Math.min(32 / width, 32 / height, 1);
        const bw = Math.max(Math.round(width * scale), 1);
        const bh = Math.max(Math.round(height * scale), 1);

        const bhCanvas = document.createElement("canvas");
        bhCanvas.width = bw;
        bhCanvas.height = bh;
        const bhCtx = bhCanvas.getContext("2d");
        if (!bhCtx) throw new Error("Failed to get canvas context");
        bhCtx.drawImage(video, 0, 0, bw, bh);

        const imageData = bhCtx.getImageData(0, 0, bw, bh);
        const blurhash = encode(imageData.data, bw, bh, 4, 3);

        // Poster: 640px wide WebP
        const posterScale = Math.min(640 / width, 1);
        const pw = Math.round(width * posterScale);
        const ph = Math.round(height * posterScale);

        const posterCanvas = document.createElement("canvas");
        posterCanvas.width = pw;
        posterCanvas.height = ph;
        const pCtx = posterCanvas.getContext("2d");
        if (!pCtx) {
          resolve({ blurhash });
          return;
        }
        pCtx.drawImage(video, 0, 0, pw, ph);

        posterCanvas.toBlob(
          (blob) => {
            resolve({ blurhash, poster: blob ?? undefined });
          },
          "image/webp",
          0.8,
        );
      } catch (err) {
        reject(err);
      }
    };
    video.onerror = () => reject(new Error("Video seek failed"));
  });
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms),
  );
}
