/**
 * Client-side Media Upload Handler
 *
 * Handles file upload flow:
 * 1. User selects file via [data-media-upload] input
 * 2. Creates placeholder in grid with spinner
 * 3. Processes image via ImageProcessor (resize/convert to WebP)
 * 4. Sets processed file on hidden Datastar form via DataTransfer API
 * 5. Triggers form.requestSubmit() — Datastar handles upload + SSE response
 */

import { ImageProcessor } from "./image-processor.js";
import { VideoProcessor } from "./video-processor.js";
import { extractMediaMetadata } from "./media-metadata.js";
import { validateUploadFile } from "../lib/upload.js";
import { showToast } from "./toast.js";

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Ensure the media grid exists, removing empty state if needed
 */
function ensureGridExists(): HTMLElement {
  let grid = document.getElementById("media-grid");
  if (grid) return grid;

  document.getElementById("empty-state")?.remove();

  grid = document.createElement("div");
  grid.id = "media-grid";
  grid.className =
    "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4";
  document.getElementById("media-content")?.appendChild(grid);
  return grid;
}

/**
 * Create a placeholder card with spinner in the media grid
 */
function createPlaceholder(
  fileName: string,
  fileSize: number,
  statusText: string,
): HTMLElement {
  const placeholder = document.createElement("div");
  placeholder.id = "upload-placeholder";
  placeholder.className = "group relative";
  placeholder.innerHTML = `
    <div class="aspect-square bg-muted rounded-lg overflow-hidden border flex items-center justify-center">
      <div class="text-center px-2">
        <svg class="animate-spin h-6 w-6 text-muted-foreground mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span id="upload-status" class="text-xs text-muted-foreground">${statusText}</span>
      </div>
    </div>
    <div class="mt-2 text-xs truncate" title="${fileName}">${fileName}</div>
    <div class="text-xs text-muted-foreground">${formatFileSize(fileSize)}</div>
  `;
  return placeholder;
}

/**
 * Replace placeholder content with an error message
 */
function showPlaceholderError(
  placeholder: HTMLElement,
  fileName: string,
  errorMessage: string,
): void {
  placeholder.innerHTML = `
    <div class="aspect-square bg-destructive/10 rounded-lg overflow-hidden border border-destructive flex items-center justify-center">
      <div class="text-center px-2">
        <span class="text-xs text-destructive">${errorMessage}</span>
      </div>
    </div>
    <div class="mt-2 text-xs truncate text-destructive">${fileName}</div>
    <button type="button" class="text-xs text-muted-foreground hover:underline" onclick="this.closest('.group').remove()">Remove</button>
  `;
}

/**
 * Handle the upload flow for a selected file
 */
async function handleUpload(
  input: HTMLInputElement,
  file: File,
): Promise<void> {
  const maxFileSizeMB = parseInt(input.dataset.maxFileSize || "500", 10) || 500;
  const processingText = input.dataset.textProcessing || "Processing...";
  const uploadingText = input.dataset.textUploading || "Uploading...";
  const errorText =
    input.dataset.textError || "Upload failed. Please try again.";

  // Validate before creating placeholder — reject immediately with toast
  const validationError = validateUploadFile(file, { maxFileSizeMB });
  if (validationError) {
    showToast(validationError, "error");
    input.value = "";
    return;
  }

  const grid = ensureGridExists();
  const placeholder = createPlaceholder(file.name, file.size, processingText);
  grid.prepend(placeholder);

  try {
    let toUpload: File;
    let width: number | undefined;
    let height: number | undefined;
    let blurhash: string | undefined;
    let poster: Blob | undefined;

    if (file.type.startsWith("video/")) {
      // Video: transcode with mediabunny (requires WebCodecs)
      if (!VideoProcessor.isSupported()) {
        showPlaceholderError(
          placeholder,
          file.name,
          "Your browser doesn't support video processing. Use Chrome or Edge to upload videos.",
        );
        input.value = "";
        return;
      }

      const statusEl = document.getElementById("upload-status");
      const result = await VideoProcessor.processToFile(file, (progress) => {
        if (statusEl) {
          statusEl.textContent = `${processingText} ${Math.round(progress * 100)}%`;
        }
      });
      toUpload = result.file;
      width = result.width;
      height = result.height;
      blurhash = result.blurhash;
      poster = result.poster;
    } else if (file.type.startsWith("image/")) {
      // Image: resize + convert to WebP
      const result = await ImageProcessor.processToFile(file);
      toUpload = result.file;
      width = result.width;
      height = result.height;
    } else {
      toUpload = file;
    }

    // Extract metadata for non-video files (video metadata comes from VideoProcessor)
    if (!file.type.startsWith("video/")) {
      const meta = await extractMediaMetadata(toUpload);
      width ??= meta.width;
      height ??= meta.height;
      blurhash ??= meta.blurhash;
      poster ??= meta.poster;
    }

    // Update status
    const statusEl = document.getElementById("upload-status");
    if (statusEl) statusEl.textContent = uploadingText;

    // Set processed file on hidden form input via DataTransfer API
    const formInput = document.getElementById(
      "upload-file-input",
    ) as HTMLInputElement | null;
    const form = document.getElementById(
      "upload-form",
    ) as HTMLFormElement | null;
    if (!formInput || !form) throw new Error("Upload form not found");

    const dt = new DataTransfer();
    dt.items.add(toUpload);
    formInput.files = dt.files;

    // Set metadata on hidden inputs
    const setHiddenValue = (id: string, value: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = value;
    };
    if (width) setHiddenValue("upload-width", String(width));
    if (height) setHiddenValue("upload-height", String(height));
    if (blurhash) setHiddenValue("upload-blurhash", blurhash);

    // Set poster file on hidden input (for video uploads)
    if (poster) {
      const posterInput = document.getElementById(
        "upload-poster-input",
      ) as HTMLInputElement | null;
      if (posterInput) {
        const posterDt = new DataTransfer();
        posterDt.items.add(
          new File([poster], "poster.webp", { type: "image/webp" }),
        );
        posterInput.files = posterDt.files;
      }
    }

    // Trigger Datastar-intercepted form submission
    form.requestSubmit();
  } catch (err) {
    const message = err instanceof Error ? err.message : errorText;
    showPlaceholderError(placeholder, file.name, message);
  }

  // Reset file input so the same file can be re-selected
  input.value = "";
}

/**
 * Initialize media upload via event delegation
 */
function initMediaUpload(): void {
  document.addEventListener("change", (e) => {
    const input = (e.target as HTMLElement).closest(
      "[data-media-upload]",
    ) as HTMLInputElement | null;
    if (!input?.files?.[0]) return;

    handleUpload(input, input.files[0]);
  });
}

initMediaUpload();
