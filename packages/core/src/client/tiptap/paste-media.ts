/**
 * Clipboard file handling for TipTap editors.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { uploadAndInsertInlineImage } from "./inline-image-upload.js";

interface ClipboardFileItemLike {
  kind: string;
  type: string;
  getAsFile(): File | null;
}

export interface ClipboardDataLike {
  items?: ArrayLike<ClipboardFileItemLike> | null;
  files?: ArrayLike<File> | null;
}

export interface PasteMediaOptions {
  shouldInsertInline?: (file: File) => boolean;
  onPasteFiles?: (files: File[]) => void;
  uploadInlineImage?: (file: File) => void | Promise<void>;
}

const pasteMediaPluginKey = new PluginKey("pasteMedia");

function getFileKey(file: File): string {
  return `${file.name}:${file.type}:${file.size}:${file.lastModified}`;
}

/**
 * Extracts pasted files from clipboard data, preferring rich clipboard items
 * when browsers provide both items and the flat FileList.
 *
 * @param clipboardData - Clipboard payload from a paste event
 * @returns Deduplicated files in browser-provided order
 * @example
 * ```ts
 * const files = getClipboardFiles(event.clipboardData);
 * ```
 */
export function getClipboardFiles(
  clipboardData: ClipboardDataLike | null | undefined,
): File[] {
  if (!clipboardData) return [];

  const items = Array.from(clipboardData.items ?? []);
  const itemFiles = items
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  const sourceFiles =
    itemFiles.length > 0 ? itemFiles : Array.from(clipboardData.files ?? []);
  const seen = new Set<string>();

  return sourceFiles.filter((file) => {
    const key = getFileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const PasteMedia = Extension.create<PasteMediaOptions>({
  name: "pasteMedia",

  addOptions() {
    return {
      shouldInsertInline: undefined,
      onPasteFiles: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    /**
     * Routes dropped/pasted files into inline images or attachments using the
     * same decision as the host (`shouldInsertInline`). Returns false when
     * there is nothing this extension can handle, so the caller leaves the
     * event to the editor's default behavior.
     */
    const routeFiles = (files: File[]): boolean => {
      const inlineFiles = files.filter(
        (file) => extension.options.shouldInsertInline?.(file) === true,
      );
      const attachmentFiles = files.filter(
        (file) => !inlineFiles.includes(file),
      );

      if (
        inlineFiles.length === 0 &&
        (attachmentFiles.length === 0 ||
          extension.options.onPasteFiles === undefined)
      ) {
        return false;
      }

      for (const file of inlineFiles) {
        const uploadInlineImage = extension.options.uploadInlineImage;
        if (uploadInlineImage) {
          void uploadInlineImage(file);
          continue;
        }
        void uploadAndInsertInlineImage(extension.editor, file);
      }

      if (
        attachmentFiles.length > 0 &&
        extension.options.onPasteFiles !== undefined
      ) {
        extension.options.onPasteFiles(attachmentFiles);
      }

      return true;
    };

    return [
      new Plugin({
        key: pasteMediaPluginKey,
        props: {
          handlePaste(_view, event) {
            const files = getClipboardFiles(event.clipboardData);
            if (files.length === 0) return false;
            if (!routeFiles(files)) return false;
            event.preventDefault();
            return true;
          },
          handleDrop(_view, event) {
            const files = getClipboardFiles(event.dataTransfer);
            if (files.length === 0) return false;
            if (!routeFiles(files)) return false;
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});
