/**
 * Client-side Audio Processor
 *
 * Transcodes audio files to AAC in an M4A container (MP4 audio-only)
 * using mediabunny. Mirrors the video-processor pattern but discards
 * any video track and skips poster/blurhash extraction.
 *
 * Requires WebCodecs API support — check `isSupported()` before use.
 */

import {
  Input,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  BlobSource,
  Conversion,
  QUALITY_HIGH,
  ALL_FORMATS,
} from "mediabunny";

export interface AudioProcessResult {
  file: File;
}

/**
 * Check if the browser supports WebCodecs-based audio processing.
 *
 * @returns `true` if `AudioEncoder` is available in the current environment
 */
function isSupported(): boolean {
  return typeof AudioEncoder !== "undefined";
}

/**
 * Process an audio file: transcode to AAC in an M4A (MP4) container.
 *
 * @param file - Source audio file
 * @param onProgress - Optional callback receiving progress from 0 to 1
 * @returns Processed M4A file
 */
async function processToFile(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<AudioProcessResult> {
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
      video: { discard: true },
      audio: { codec: "aac", bitrate: QUALITY_HIGH },
    });

    if (onProgress) {
      conversion.onProgress = onProgress;
    }

    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer) throw new Error("Audio processing produced no output");

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const m4aFile = new File([buffer], `${originalName}.m4a`, {
      type: "audio/mp4",
    });

    return { file: m4aFile };
  } finally {
    input.dispose();
  }
}

export const AudioProcessor = { isSupported, processToFile };
