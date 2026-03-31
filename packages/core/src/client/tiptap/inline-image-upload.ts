/**
 * Shared inline image upload helper for TipTap editors.
 *
 * Tracks in-flight uploads so content can be transferred between editors
 * (e.g. fullscreen → compose) without waiting for uploads to finish.
 */

import type { Editor, JSONContent } from "@tiptap/core";
import { uploadWithMetadata } from "../upload-with-metadata.js";

type InlineImageUpload = (file: File) => Promise<{ url: string }>;

/**
 * Registry of in-flight inline image uploads.
 * Maps blob: placeholder URLs to a promise that resolves with the final URL.
 * Entries are removed when the upload completes and the original editor handles
 * replacement, or when another editor adopts ownership.
 */
const inflightUploads = new Map<string, Promise<string>>();

/**
 * Registry of adopted inline image uploads.
 * When another editor takes ownership of an upload via adoptPendingInlineImageUploads,
 * the promise is moved here so resolveInlineImageUrls can still find it at submit time.
 * Entries are removed when the upload settles.
 */
const adoptedUploads = new Map<string, Promise<string>>();

function replaceInlineImage(editor: Editor, blobUrl: string, realUrl: string) {
  if (editor.isDestroyed) return;
  const { doc } = editor.state;
  let replaced = false;
  doc.descendants((node, pos) => {
    if (replaced || node.type.name !== "image" || node.attrs.src !== blobUrl) {
      return;
    }

    editor
      .chain()
      .command(({ tr }) => {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          src: realUrl,
        });
        return true;
      })
      .run();
    replaced = true;
  });
}

function removeInlineImage(editor: Editor, blobUrl: string) {
  if (editor.isDestroyed) return;
  const { doc } = editor.state;
  doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === blobUrl) {
      editor
        .chain()
        .command(({ tr }) => {
          tr.delete(pos, pos + node.nodeSize);
          return true;
        })
        .run();
    }
  });
}

/**
 * Uploads an image file and inserts it into the editor as an inline image.
 *
 * The upload is tracked in a shared registry so other editors can adopt
 * ownership if the content is transferred (e.g. fullscreen close).
 *
 * @param editor - TipTap editor instance that should receive the uploaded image
 * @param file - Image file to upload
 * @param uploadImage - Upload implementation used to turn a File into a public URL
 * @returns Resolves after the placeholder image is replaced or removed
 * @example
 * ```ts
 * await uploadAndInsertInlineImage(editor, file);
 * ```
 */
export async function uploadAndInsertInlineImage(
  editor: Editor,
  file: File,
  uploadImage: InlineImageUpload = uploadWithMetadata,
): Promise<void> {
  const placeholderUrl = URL.createObjectURL(file);
  editor.chain().focus().setImage({ src: placeholderUrl }).run();

  const uploaded = uploadImage(file).then((data) => data.url);
  inflightUploads.set(placeholderUrl, uploaded);

  try {
    const realUrl = await uploaded;
    replaceInlineImage(editor, placeholderUrl, realUrl);
  } catch {
    removeInlineImage(editor, placeholderUrl);
  } finally {
    // Only cleanup if not adopted by another editor
    if (inflightUploads.delete(placeholderUrl)) {
      URL.revokeObjectURL(placeholderUrl);
    }
  }
}

/**
 * Adopt in-flight inline image uploads into a new editor instance.
 *
 * Scans the editor's document for blob: image URLs that match pending uploads.
 * For each match, takes ownership from the original editor and sets up
 * replacement/removal watchers on the new editor.
 *
 * Call this immediately after `setContent` with JSON that may contain blob: URLs
 * (e.g. after fullscreen close transfers content back to compose editor).
 *
 * @param editor - The TipTap editor that now contains the content with blob: URLs
 * @returns Array of promises that resolve when each adopted upload completes
 */
export function adoptPendingInlineImageUploads(
  editor: Editor,
): Promise<void>[] {
  const adopted: Promise<void>[] = [];
  const { doc } = editor.state;

  doc.descendants((node) => {
    if (node.type.name !== "image") return;
    const src = node.attrs.src as string;
    if (!src?.startsWith("blob:")) return;

    const uploaded = inflightUploads.get(src);
    if (!uploaded) return;

    // Take ownership — prevents original editor's finally from revoking the URL.
    // Move to adoptedUploads so resolveInlineImageUrls can still find the promise
    // if the user submits before the upload completes.
    inflightUploads.delete(src);
    adoptedUploads.set(src, uploaded);

    const promise = uploaded
      .then(
        (realUrl) => replaceInlineImage(editor, src, realUrl),
        () => removeInlineImage(editor, src),
      )
      .finally(() => {
        adoptedUploads.delete(src);
        URL.revokeObjectURL(src);
      });
    adopted.push(promise);
  });

  return adopted;
}

/**
 * Resolve all blob: inline image URLs in a TipTap JSON document.
 *
 * Waits for pending uploads and returns a new JSON tree with real URLs.
 * Failed or unresolvable blob: images are removed from the content.
 *
 * Used by the submit bridge to finalize content before posting.
 *
 * @param json - TipTap JSON document that may contain blob: image URLs
 * @returns Resolved JSON with all blob: URLs replaced or removed
 */
export async function resolveInlineImageUrls(
  json: JSONContent | null,
): Promise<JSONContent | null> {
  if (!json) return json;

  // Collect all blob URLs and their upload promises
  const blobUrls = new Map<string, Promise<string>>();
  collectBlobUrls(json, blobUrls);

  if (blobUrls.size === 0) return json;

  // Wait for all uploads to settle
  const resolved = new Map<string, string>();
  await Promise.allSettled(
    Array.from(blobUrls.entries()).map(async ([blobUrl, promise]) => {
      const realUrl = await promise;
      resolved.set(blobUrl, realUrl);
    }),
  );

  return replaceBlobUrlsInJson(json, resolved);
}

function collectBlobUrls(node: JSONContent, out: Map<string, Promise<string>>) {
  if (
    node.type === "image" &&
    typeof node.attrs?.src === "string" &&
    node.attrs.src.startsWith("blob:")
  ) {
    const promise =
      inflightUploads.get(node.attrs.src) ?? adoptedUploads.get(node.attrs.src);
    if (promise) {
      out.set(node.attrs.src, promise);
    }
  }
  if (node.content) {
    for (const child of node.content) {
      collectBlobUrls(child, out);
    }
  }
}

function replaceBlobUrlsInJson(
  node: JSONContent,
  resolved: Map<string, string>,
): JSONContent {
  // Remove image nodes with unresolved blob URLs (upload failed or orphaned)
  if (
    node.type === "image" &&
    typeof node.attrs?.src === "string" &&
    node.attrs.src.startsWith("blob:")
  ) {
    const realUrl = resolved.get(node.attrs.src);
    if (!realUrl) {
      // Signal removal by returning a marker — handled by parent
      return { type: "__removed__" };
    }
    return { ...node, attrs: { ...node.attrs, src: realUrl } };
  }

  if (!node.content) return node;

  const newContent = node.content
    .map((child) => replaceBlobUrlsInJson(child, resolved))
    .filter((child) => child.type !== "__removed__");

  return newContent === node.content ? node : { ...node, content: newContent };
}
