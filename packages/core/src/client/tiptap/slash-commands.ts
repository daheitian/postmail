/**
 * Slash Commands Extension
 *
 * Provides a "/" command menu for block formatting.
 * Built on @tiptap/suggestion for cursor tracking and filtering.
 */

import { Extension } from "@tiptap/core";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import type { Editor, Range } from "@tiptap/core";

// SVG icons (18×18, stroke-based, Lucide style)
const ICONS = {
  image: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
  divider: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/></svg>`,
  readMore: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18"/><path d="m9 18 3 3 3-3"/><path d="m9 6-3-3-3 3"/><path d="M3 6h18"/></svg>`,
  table: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>`,
  code: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  blockquote: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
  bulletList: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`,
  orderedList: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
  h1: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 12l3-2v10"/></svg>`,
  h2: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,
  h3: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>`,
} as const;

interface SlashCommandItem {
  label: string;
  icon: string;
  command: (editor: Editor, range: Range) => void;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    label: "Media",
    icon: ICONS.image,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      document.dispatchEvent(
        new CustomEvent("jant:slash-image", { bubbles: true }),
      );
    },
  },
  {
    label: "Divider",
    icon: ICONS.divider,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    label: "Read More",
    icon: ICONS.readMore,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({ type: "moreBreak" })
        .run();
    },
  },
  {
    label: "Table",
    icon: ICONS.table,
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
    label: "Code Block",
    icon: ICONS.code,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    label: "Blockquote",
    icon: ICONS.blockquote,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    label: "Bullet List",
    icon: ICONS.bulletList,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    label: "Ordered List",
    icon: ICONS.orderedList,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    label: "Heading 1",
    icon: ICONS.h1,
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
    icon: ICONS.h2,
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
    icon: ICONS.h3,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleHeading({ level: 3 })
        .run();
    },
  },
];

/** Check whether a document already contains a moreBreak node */
function hasMoreBreak(editor: Editor): boolean {
  let found = false;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "moreBreak") {
      found = true;
      return false; // stop traversal
    }
    return !found;
  });
  return found;
}

/**
 * Returns the slash commands list, used by both the extension and the + menu.
 * Omits "Read More" when the document already contains one.
 */
export function getSlashCommands(editor?: Editor): SlashCommandItem[] {
  if (editor && hasMoreBreak(editor)) {
    return SLASH_COMMANDS.filter((item) => item.label !== "Read More");
  }
  return SLASH_COMMANDS;
}

// Popup element management
let popupEl: HTMLElement | null = null;
let selectedIndex = 0;
let filteredItems: SlashCommandItem[] = [];
let commandFn: ((item: { index: number }) => void) | null = null;
let editorRef: Editor | null = null;
let currentRange: Range | null = null;
let outsideClickHandler: ((e: MouseEvent) => void) | null = null;

function createPopup(): HTMLElement {
  const el = document.createElement("div");
  el.className = "tiptap-slash-menu";
  el.style.position = "fixed";
  return el;
}

/** Scroll the selected item into view within the popup only (no ancestor scroll) */
function scrollSelectedIntoView() {
  if (!popupEl) return;
  const selected = popupEl.querySelector(
    ".tiptap-slash-item.is-selected",
  ) as HTMLElement | null;
  if (!selected) return;
  const itemTop = selected.offsetTop;
  const itemBottom = itemTop + selected.offsetHeight;
  const scrollTop = popupEl.scrollTop;
  const viewBottom = scrollTop + popupEl.clientHeight;
  if (itemTop < scrollTop) {
    popupEl.scrollTop = itemTop;
  } else if (itemBottom > viewBottom) {
    popupEl.scrollTop = itemBottom - popupEl.clientHeight;
  }
}

/** Update selection highlight and scroll into view */
function updateSelection() {
  popupEl
    ?.querySelectorAll(".tiptap-slash-item")
    .forEach((item, i) =>
      item.classList.toggle("is-selected", i === selectedIndex),
    );
  scrollSelectedIntoView();
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
      updateSelection();
    });
  });
}

function destroyPopup() {
  if (outsideClickHandler) {
    document.removeEventListener("mousedown", outsideClickHandler, true);
    outsideClickHandler = null;
  }
  popupEl?.remove();
  popupEl = null;
  selectedIndex = 0;
  filteredItems = [];
  commandFn = null;
  editorRef = null;
  currentRange = null;
}

/**
 * Position the popup relative to the cursor, accounting for dialog containing block.
 * When a `<dialog>` has CSS animation, it creates a containing block that makes
 * `position: fixed` relative to the dialog instead of the viewport.
 * Flips above the cursor when there isn't enough space below.
 */
function positionPopup(
  rect: globalThis.DOMRect,
  container: HTMLElement | null,
) {
  if (!popupEl) return;

  // Reset inline max-height so offsetHeight reflects the natural size
  popupEl.style.maxHeight = "";

  const offsetX = container?.getBoundingClientRect().left ?? 0;
  const offsetY = container?.getBoundingClientRect().top ?? 0;
  const containerHeight = container?.clientHeight ?? window.innerHeight;
  const popupHeight = popupEl.offsetHeight;
  const gap = 4;

  const left = rect.left - offsetX;
  const belowTop = rect.bottom + gap - offsetY;
  const spaceBelow = containerHeight - belowTop;
  const spaceAbove = rect.top - offsetY - gap;

  popupEl.style.left = `${left}px`;

  if (popupHeight > spaceBelow && spaceAbove > spaceBelow) {
    // Not enough space below and more room above — flip
    const maxH = Math.min(popupHeight, spaceAbove);
    if (popupHeight > spaceAbove) {
      popupEl.style.maxHeight = `${spaceAbove}px`;
    }
    popupEl.style.top = `${rect.top - offsetY - maxH - gap}px`;
  } else {
    // Show below (constrain if needed)
    if (popupHeight > spaceBelow) {
      popupEl.style.maxHeight = `${spaceBelow}px`;
    }
    popupEl.style.top = `${belowTop}px`;
  }
}

/** Install a click-outside handler to dismiss the suggestion on external clicks */
function installClickOutside() {
  outsideClickHandler = (e: MouseEvent) => {
    if (!popupEl || popupEl.contains(e.target as Node)) return;
    // Click anywhere outside the popup (including inside the editor) — dismiss
    // by deleting the trigger text so the suggestion plugin deactivates via onExit
    if (editorRef && currentRange) {
      const { state, view } = editorRef;
      view.dispatch(state.tr.delete(currentRange.from, currentRange.to));
    }
  };
  document.addEventListener("mousedown", outsideClickHandler, true);
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
        items: ({ query, editor }: { query: string; editor: Editor }) => {
          const q = query.toLowerCase();
          return getSlashCommands(editor).filter((item) =>
            item.label.toLowerCase().includes(q),
          );
        },
        render: () => {
          function getEditorElement(editor: Editor): globalThis.Element | null {
            const el = editor.options.element;
            return el instanceof globalThis.Element ? el : null;
          }

          return {
            onStart: (
              props: SuggestionProps<SlashCommandItem, { index: number }>,
            ) => {
              popupEl = createPopup();
              selectedIndex = 0;
              commandFn = props.command;
              editorRef = props.editor;
              currentRange = props.range;
              renderPopup(props.items, (index) => props.command({ index }));

              // Append inside the closest dialog (top-layer) or body
              const editorEl = getEditorElement(props.editor);
              const dialog = editorEl?.closest("dialog") ?? null;
              (dialog ?? document.body).appendChild(popupEl);

              const rect = props.clientRect?.();
              if (rect) {
                positionPopup(rect, dialog);
              }

              installClickOutside();
            },
            onUpdate: (
              props: SuggestionProps<SlashCommandItem, { index: number }>,
            ) => {
              commandFn = props.command;
              currentRange = props.range;
              renderPopup(props.items, (index) => props.command({ index }));
              const rect = props.clientRect?.();
              if (rect) {
                const editorEl = getEditorElement(props.editor);
                const dialog = editorEl?.closest("dialog") ?? null;
                positionPopup(rect, dialog);
              }
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              const { event } = props;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                selectedIndex = (selectedIndex + 1) % filteredItems.length;
                updateSelection();
                return true;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                selectedIndex =
                  (selectedIndex - 1 + filteredItems.length) %
                  filteredItems.length;
                updateSelection();
                return true;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                commandFn?.({ index: selectedIndex });
                return true;
              }
              if (event.key === "Escape") {
                // Stop propagation to prevent parent dialog from closing
                event.stopPropagation();
                event.preventDefault();
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
