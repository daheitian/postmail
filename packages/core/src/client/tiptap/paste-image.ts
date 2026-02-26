/**
 * Paste Image Extension
 *
 * Intercepts paste events containing images and either:
 * - Uploads inline (if post has a title → image becomes part of body)
 * - Dispatches as attachment (if no title → goes to attachment strip)
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const pasteImagePluginKey = new PluginKey("pasteImage");

export const PasteImage = Extension.create({
  name: "pasteImage",

  addStorage() {
    return {
      hasTitle: false,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: pasteImagePluginKey,
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            const imageFiles: File[] = [];
            for (const item of items) {
              if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) imageFiles.push(file);
              }
            }

            if (imageFiles.length === 0) return false;

            event.preventDefault();

            const hasTitle = extension.storage.hasTitle;

            if (hasTitle) {
              // Upload and insert inline
              for (const file of imageFiles) {
                uploadAndInsertImage(file, extension.editor);
              }
            } else {
              // Dispatch as attachment (existing flow)
              const files = imageFiles.map((file) => ({
                file,
                clientId: crypto.randomUUID(),
              }));
              document.dispatchEvent(
                new CustomEvent("jant:files-selected", {
                  bubbles: true,
                  detail: { files },
                }),
              );
            }

            return true;
          },
        },
      }),
    ];
  },
});

async function uploadAndInsertImage(
  file: File,
  editor: import("@tiptap/core").Editor,
) {
  // Insert placeholder
  const placeholderUrl = URL.createObjectURL(file);
  editor
    .chain()
    .focus()
    .setImage({ src: placeholderUrl, alt: file.name })
    .run();

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = (await response.json()) as { url: string };

    // Replace placeholder URL with actual URL in the document
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
    // Remove the placeholder image on failure
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
