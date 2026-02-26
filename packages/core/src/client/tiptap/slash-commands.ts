/**
 * Slash Commands Extension
 *
 * Provides a "/" command menu for block formatting.
 * Built on @tiptap/suggestion for cursor tracking and filtering.
 */

import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";

interface SlashCommandItem {
  label: string;
  icon: string;
  command: (editor: Editor, range: Range) => void;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    label: "Heading 1",
    icon: "H1",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleHeading({ level: 1 })
        .run();
    },
  },
  {
    label: "Heading 2",
    icon: "H2",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleHeading({ level: 2 })
        .run();
    },
  },
  {
    label: "Heading 3",
    icon: "H3",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleHeading({ level: 3 })
        .run();
    },
  },
  {
    label: "Bullet List",
    icon: "•",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    label: "Ordered List",
    icon: "1.",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    label: "Blockquote",
    icon: '"',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    label: "Code Block",
    icon: "</>",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    label: "Horizontal Rule",
    icon: "—",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    label: "Image",
    icon: "🖼",
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      document.dispatchEvent(
        new CustomEvent("jant:slash-image", { bubbles: true }),
      );
    },
  },
  {
    label: "Table",
    icon: "▦",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    label: "Read More",
    icon: "↓",
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "moreBreak" })
        .run();
    },
  },
];

/**
 * Returns the slash commands list, used by both the extension and the + menu.
 */
export function getSlashCommands(): SlashCommandItem[] {
  return SLASH_COMMANDS;
}

// Popup element management
let popupEl: HTMLElement | null = null;
let selectedIndex = 0;
let filteredItems: SlashCommandItem[] = [];
let commandFn: ((item: { index: number }) => void) | null = null;

function createPopup(): HTMLElement {
  const el = document.createElement("div");
  el.className = "tiptap-slash-menu";
  el.style.position = "fixed";
  return el;
}

function renderPopup(
  items: SlashCommandItem[],
  onSelect: (index: number) => void,
) {
  if (!popupEl) return;

  filteredItems = items;
  if (selectedIndex >= items.length) selectedIndex = 0;

  popupEl.innerHTML = items
    .map(
      (item, i) =>
        `<div class="tiptap-slash-item${i === selectedIndex ? " is-selected" : ""}" data-index="${i}">
          <span class="tiptap-slash-item-icon">${item.icon}</span>
          <span class="tiptap-slash-item-label">${item.label}</span>
        </div>`,
    )
    .join("");

  // Click handlers
  popupEl.querySelectorAll<HTMLElement>(".tiptap-slash-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const idx = parseInt(el.dataset.index ?? "0", 10);
      onSelect(idx);
    });
    el.addEventListener("mouseenter", () => {
      selectedIndex = parseInt(el.dataset.index ?? "0", 10);
      popupEl
        ?.querySelectorAll(".tiptap-slash-item")
        .forEach((item, i) =>
          item.classList.toggle("is-selected", i === selectedIndex),
        );
    });
  });
}

function destroyPopup() {
  popupEl?.remove();
  popupEl = null;
  selectedIndex = 0;
  filteredItems = [];
  commandFn = null;
}

/**
 * Position the popup relative to the cursor, accounting for dialog containing block.
 * When a `<dialog>` has CSS animation, it creates a containing block that makes
 * `position: fixed` relative to the dialog instead of the viewport.
 */
function positionPopup(
  rect: globalThis.DOMRect,
  container: HTMLElement | null,
) {
  if (!popupEl) return;
  const offsetX = container?.getBoundingClientRect().left ?? 0;
  const offsetY = container?.getBoundingClientRect().top ?? 0;
  popupEl.style.left = `${rect.left - offsetX}px`;
  popupEl.style.top = `${rect.bottom + 4 - offsetY}px`;
}

/**
 * Slash commands Tiptap extension.
 */
export const SlashCommands = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: ({ query }: { query: string }) => {
          const q = query.toLowerCase();
          return SLASH_COMMANDS.filter((item) =>
            item.label.toLowerCase().includes(q),
          );
        },
        render: () => {
          return {
            onStart: (props: {
              items: SlashCommandItem[];
              command: (item: { index: number }) => void;
              clientRect: (() => globalThis.DOMRect | null) | null;
              editor: Editor;
            }) => {
              popupEl = createPopup();
              selectedIndex = 0;
              commandFn = props.command;
              renderPopup(props.items, (index) => props.command({ index }));

              // Append inside the closest dialog (top-layer) or body
              const editorEl = props.editor.options.element;
              const dialog = editorEl.closest("dialog");
              (dialog ?? document.body).appendChild(popupEl);

              const rect = props.clientRect?.();
              if (rect) {
                positionPopup(rect, dialog);
              }
            },
            onUpdate: (props: {
              items: SlashCommandItem[];
              command: (item: { index: number }) => void;
              clientRect: (() => globalThis.DOMRect | null) | null;
              editor: Editor;
            }) => {
              commandFn = props.command;
              renderPopup(props.items, (index) => props.command({ index }));
              const rect = props.clientRect?.();
              if (rect) {
                const editorEl = props.editor.options.element;
                const dialog = editorEl.closest("dialog");
                positionPopup(rect, dialog);
              }
            },
            onKeyDown: (props: { event: globalThis.KeyboardEvent }) => {
              const { event } = props;
              if (event.key === "ArrowDown") {
                selectedIndex = (selectedIndex + 1) % filteredItems.length;
                popupEl
                  ?.querySelectorAll(".tiptap-slash-item")
                  .forEach((item, i) =>
                    item.classList.toggle("is-selected", i === selectedIndex),
                  );
                return true;
              }
              if (event.key === "ArrowUp") {
                selectedIndex =
                  (selectedIndex - 1 + filteredItems.length) %
                  filteredItems.length;
                popupEl
                  ?.querySelectorAll(".tiptap-slash-item")
                  .forEach((item, i) =>
                    item.classList.toggle("is-selected", i === selectedIndex),
                  );
                return true;
              }
              if (event.key === "Enter") {
                commandFn?.({ index: selectedIndex });
                return true;
              }
              if (event.key === "Escape") {
                destroyPopup();
                return true;
              }
              return false;
            },
            onExit: () => {
              destroyPopup();
            },
          };
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: { index: number };
        }) => {
          const item = filteredItems[props.index];
          if (item) {
            item.command(editor, range);
          }
        },
      } satisfies Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
