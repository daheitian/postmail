/**
 * Shared inline image upload helper for TipTap editors.
 */

import type { Editor } from "@tiptap/core";
import { uploadWithMetadata } from "../upload-with-metadata.js";

type InlineImageUpload = (file: File) => Promise<{ url: string }>;

/**
 * Uploads an image file and inserts it into the editor as an inline image.
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

  try {
    const data = await uploadImage(file);

    const { doc } = editor.state;
    let replaced = false;
    doc.descendants((node, pos) => {
      if (
        replaced ||
        node.type.name !== "image" ||
        node.attrs.src !== placeholderUrl
      ) {
        return;
      }

      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            src: data.url,
          });
          return true;
        })
        .run();
      replaced = true;
    });
  } catch {
    const { doc } = editor.state;
    doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.src === placeholderUrl) {
        editor
          .chain()
          .command(({ tr }) => {
            tr.delete(pos, pos + node.nodeSize);
            return true;
          })
          .run();
      }
    });
  } finally {
    URL.revokeObjectURL(placeholderUrl);
  }
}
