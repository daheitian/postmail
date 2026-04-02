import { createNodeFromContent, Extension } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

function toFragment(
  content: ReturnType<typeof createNodeFromContent>,
): Fragment {
  return content instanceof Fragment ? content : content.content;
}

export const MarkdownClipboard = Extension.create({
  name: "markdownClipboard",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          clipboardTextParser: (text, _context, _plainText, view) => {
            if (!text.trim() || !this.editor.markdown) {
              return Slice.empty;
            }

            const parsed = this.editor.markdown.parse(text);
            if (parsed.type !== "doc" || !parsed.content) {
              return Slice.empty;
            }

            if (
              parsed.content.length === 1 &&
              parsed.content[0]?.type === "paragraph"
            ) {
              const paragraph = parsed.content[0];
              if (!paragraph?.content) {
                return Slice.empty;
              }

              const content = createNodeFromContent(
                paragraph.content,
                view.state.schema,
                {
                  slice: true,
                },
              );

              return Slice.maxOpen(toFragment(content));
            }

            const content = createNodeFromContent(parsed, view.state.schema, {
              slice: false,
            });

            return Slice.maxOpen(toFragment(content));
          },
        },
      }),
    ];
  },
});
