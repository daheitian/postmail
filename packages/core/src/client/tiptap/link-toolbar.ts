/**
 * Link Toolbar Extension
 *
 * Floating toolbar for link editing with two modes:
 * - Input mode: light popup with URL field + confirm button (speech-bubble arrow)
 * - Preview mode: dark tooltip showing truncated URL + edit/delete buttons
 *
 * Replaces the browser prompt() dialog for link creation.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  applyDockedToolbarOffset,
  isComposeDockedToolbar,
  type FormattingToolbarMode,
} from "./toolbar-mode.js";
import {
  getFixedFloatingContainerRect,
  getFloatingPosition,
} from "./floating-position.js";

const linkToolbarKey = new PluginKey("linkToolbar");

type Mode = "hidden" | "input" | "preview";
let currentMode: Mode = "hidden";

/** Returns true when the link input popup is visible. Used by bubble menu to hide itself. */
export function isLinkToolbarInputActive(): boolean {
  return currentMode === "input";
}

// SVG icons (14×14 for preview buttons, 16×16 for confirm)
const ICON_ENTER = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>`;
const ICON_EDIT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`;
const ICON_TRASH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`;

interface LinkRange {
  from: number;
  to: number;
  href: string;
}

/** Find the extent of a link mark around the cursor position. */
function getLinkRange(state: EditorState): LinkRange | null {
  const { selection } = state;
  if (!selection.empty) return null;

  const $pos = selection.$from;
  const linkType = state.schema.marks.link;
  if (!linkType) return null;

  const marks = $pos.marks();
  const linkMark = marks.find((m) => m.type === linkType);
  if (!linkMark) return null;

  // Walk the parent node's children to find the text range covered by this link
  const parent = $pos.parent;
  const parentOffset = $pos.start();
  let from = 0;
  let to = 0;
  let found = false;
  let offset = 0;

  for (let i = 0; i < parent.childCount; i++) {
    const child = parent.child(i);
    const childFrom = parentOffset + offset;
    const childTo = childFrom + child.nodeSize;

    if (
      child.marks.some(
        (m) => m.type === linkType && m.attrs.href === linkMark.attrs.href,
      )
    ) {
      if (!found) {
        from = childFrom;
        found = true;
      }
      to = childTo;
    } else if (found) {
      break;
    }

    offset += child.nodeSize;
  }

  if (!found) return null;
  return { from, to, href: linkMark.attrs.href as string };
}

export const LinkToolbar = Extension.create({
  name: "linkToolbar",

  addOptions() {
    return {
      toolbarMode: "default" as FormattingToolbarMode,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const toolbarMode = this.options.toolbarMode as FormattingToolbarMode;

    // DOM elements
    let inputEl: HTMLElement | null = null;
    let previewEl: HTMLElement | null = null;
    let inputField: HTMLInputElement | null = null;

    // State
    let savedFrom = 0;
    let savedTo = 0;
    let suppressNextUpdate = false;
    let suppressPreview = false;
    let outsideClickHandler: ((e: MouseEvent) => void) | null = null;

    function createElements() {
      // --- Input popup ---
      inputEl = document.createElement("div");
      inputEl.className = "tiptap-link-input";
      inputEl.dataset.editorFloatingUi = "true";
      inputEl.style.display = "none";

      inputField = document.createElement("input");
      inputField.type = "url";
      inputField.className = "tiptap-link-input-field";
      inputField.placeholder = "https://";

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "tiptap-link-input-confirm";
      confirmBtn.innerHTML = ICON_ENTER;
      confirmBtn.title = "Apply link";

      inputEl.appendChild(inputField);
      inputEl.appendChild(confirmBtn);

      // Input key handling
      inputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          confirmLink();
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          hideAll();
          editor.commands.focus();
        }
      });

      // Confirm button
      confirmBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        confirmLink();
      });

      // Prevent input popup clicks from bubbling
      inputEl.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });

      // --- Preview tooltip ---
      previewEl = document.createElement("div");
      previewEl.className = "tiptap-link-preview";
      previewEl.dataset.editorFloatingUi = "true";
      previewEl.style.display = "none";

      const urlSpan = document.createElement("span");
      urlSpan.className = "tiptap-link-preview-url";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "tiptap-link-preview-btn";
      editBtn.innerHTML = ICON_EDIT;
      editBtn.title = "Edit link";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "tiptap-link-preview-btn";
      deleteBtn.innerHTML = ICON_TRASH;
      deleteBtn.title = "Remove link";

      previewEl.appendChild(urlSpan);
      previewEl.appendChild(editBtn);
      previewEl.appendChild(deleteBtn);

      // Edit button — switch to input with current href
      editBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const url = urlSpan.textContent ?? "";
        const range = getLinkRange(editor.state);
        if (range) {
          showInput(editor.view, url, range.from, range.to);
        }
      });

      // Delete button — remove link
      deleteBtn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        hideAll();
        editor.chain().focus().unsetLink().run();
      });

      // Prevent preview clicks from bubbling
      previewEl.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    function positionPopup(
      el: HTMLElement,
      view: EditorView,
      from: number,
      to: number,
    ) {
      const docked = isComposeDockedToolbar(toolbarMode);
      const dockedClass =
        el === inputEl
          ? "tiptap-link-input-docked"
          : "tiptap-link-preview-docked";

      el.classList.toggle(dockedClass, docked);
      el.style.display = "flex";

      if (docked) {
        applyDockedToolbarOffset(el, view);
        el.style.removeProperty("left");
        el.style.removeProperty("top");
        return;
      }

      const dialog = view.dom.closest("dialog");
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      const rect = el.getBoundingClientRect();
      const layout = getFloatingPosition({
        anchorRect: {
          left: start.left,
          right: end.right,
          top: Math.min(start.top, end.top),
          bottom: Math.max(start.bottom, end.bottom),
        },
        containerRect: getFixedFloatingContainerRect(dialog),
        floatingWidth: rect.width,
        floatingHeight: rect.height,
        preferredPlacement: "top",
        fallbackPlacement: "bottom",
        align: "center",
      });

      el.style.left = `${layout.left}px`;
      el.style.top = `${layout.top}px`;
    }

    function showInput(
      view: EditorView,
      href: string,
      from?: number,
      to?: number,
    ) {
      if (!inputEl || !inputField) return;

      // Save selection range
      if (from !== undefined && to !== undefined) {
        savedFrom = from;
        savedTo = to;
      } else {
        savedFrom = view.state.selection.from;
        savedTo = view.state.selection.to;
      }

      // Hide preview if showing
      if (previewEl) previewEl.style.display = "none";

      currentMode = "input";
      inputField.value = href;
      positionPopup(inputEl, view, savedFrom, savedTo);

      // Focus field after a tick so positioning is settled
      const field = inputField;
      requestAnimationFrame(() => {
        field.focus();
        field.select();
      });

      // Register outside-click handler
      removeOutsideClickHandler();
      outsideClickHandler = (e: MouseEvent) => {
        if (inputEl && !inputEl.contains(e.target as Node)) {
          hideAll();
          // Don't refocus editor here — user clicked somewhere intentionally
        }
      };
      // Use setTimeout so the current click doesn't immediately trigger it
      setTimeout(() => {
        if (outsideClickHandler) {
          document.addEventListener("mousedown", outsideClickHandler, true);
        }
      }, 0);
    }

    function showPreview(view: EditorView, range: LinkRange) {
      if (!previewEl) return;

      currentMode = "preview";
      const urlSpan = previewEl.querySelector(".tiptap-link-preview-url");
      if (urlSpan) {
        // Truncate display URL
        const display =
          range.href.length > 40 ? range.href.slice(0, 40) + "…" : range.href;
        urlSpan.textContent = display;
        urlSpan.setAttribute("title", range.href);
      }

      positionPopup(previewEl, view, range.from, range.to);

      // Register outside-click handler to dismiss preview
      removeOutsideClickHandler();
      outsideClickHandler = (e: MouseEvent) => {
        if (previewEl && !previewEl.contains(e.target as Node)) {
          suppressPreview = true;
          hideAll();
        }
      };
      setTimeout(() => {
        if (outsideClickHandler) {
          document.addEventListener("mousedown", outsideClickHandler, true);
        }
      }, 0);
    }

    function hideAll() {
      if (inputEl) inputEl.style.display = "none";
      if (previewEl) previewEl.style.display = "none";
      currentMode = "hidden";
      removeOutsideClickHandler();
    }

    function removeOutsideClickHandler() {
      if (outsideClickHandler) {
        document.removeEventListener("mousedown", outsideClickHandler, true);
        outsideClickHandler = null;
      }
    }

    function confirmLink() {
      if (!inputField) return;
      const url = inputField.value.trim();
      hideAll();

      if (url) {
        // Restore selection and apply link
        editor
          .chain()
          .focus()
          .setTextSelection({ from: savedFrom, to: savedTo })
          .setLink({ href: url })
          .setTextSelection(savedTo)
          .run();
      } else {
        // Empty URL — remove link if one existed
        editor
          .chain()
          .focus()
          .setTextSelection({ from: savedFrom, to: savedTo })
          .unsetLink()
          .setTextSelection(savedTo)
          .run();
      }

      // Suppress the next update so the newly-created link doesn't trigger preview
      suppressNextUpdate = true;
    }

    return [
      new Plugin({
        key: linkToolbarKey,
        view(editorView) {
          createElements();
          const dialog = editorView.dom.closest("dialog");
          if (inputEl) (dialog ?? document.body).appendChild(inputEl);
          if (previewEl) (dialog ?? document.body).appendChild(previewEl);

          // Listen for bubble menu link button
          const handler = () => {
            showInput(editorView, "");
          };
          editorView.dom.addEventListener("tiptap:open-link-input", handler);

          // Escape key dismisses preview
          const keyHandler = (e: globalThis.KeyboardEvent) => {
            if (e.key === "Escape" && currentMode === "preview") {
              e.preventDefault();
              e.stopPropagation();
              suppressPreview = true;
              hideAll();
            }
          };
          editorView.dom.addEventListener("keydown", keyHandler);

          return {
            update(view) {
              if (suppressNextUpdate) {
                suppressNextUpdate = false;
                return;
              }

              // While input is open, just reposition
              if (currentMode === "input") {
                if (inputEl) {
                  positionPopup(inputEl, view, savedFrom, savedTo);
                }
                return;
              }

              // Detect link under cursor for preview mode
              const range = getLinkRange(view.state);
              if (range) {
                if (!suppressPreview) {
                  showPreview(view, range);
                }
              } else {
                // Cursor moved off link — reset suppress flag
                suppressPreview = false;
                if (currentMode === "preview") {
                  hideAll();
                }
              }
            },
            destroy() {
              editorView.dom.removeEventListener(
                "tiptap:open-link-input",
                handler,
              );
              editorView.dom.removeEventListener("keydown", keyHandler);
              removeOutsideClickHandler();
              inputEl?.remove();
              previewEl?.remove();
              inputEl = null;
              previewEl = null;
              currentMode = "hidden";
            },
          };
        },
      }),
    ];
  },
});
