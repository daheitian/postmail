/**
 * Compose Fullscreen (Zen Mode)
 *
 * Full-screen overlay editor with its own Tiptap instance.
 * Opens from compose editor via jant:fullscreen-open event,
 * returns content via jant:fullscreen-close event.
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { Editor, JSONContent } from "@tiptap/core";
import type { ComposeLabels } from "./compose-types.js";
import { createTiptapEditor } from "../tiptap/create-editor.js";
import { getSlashCommands } from "../tiptap/slash-commands.js";

export class JantComposeFullscreen extends LitElement {
  static properties = {
    labels: { type: Object },
    _open: { state: true },
    _title: { state: true },
    _showTitle: { state: true },
    _actionsOpen: { state: true },
  };

  declare labels: ComposeLabels;
  declare _open: boolean;
  declare _title: string;
  declare _showTitle: boolean;
  declare _actionsOpen: boolean;

  private _editor: Editor | null = null;
  private _content: JSONContent | null = null;
  private _fileInput: HTMLInputElement | null = null;

  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
    this.labels = {} as ComposeLabels;
    this._open = false;
    this._title = "";
    this._showTitle = false;
    this._actionsOpen = false;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(
      "jant:fullscreen-open",
      this._onOpen as EventListener,
    );
    document.addEventListener("jant:slash-image", this._onSlashImage);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      "jant:fullscreen-open",
      this._onOpen as EventListener,
    );
    document.removeEventListener("jant:slash-image", this._onSlashImage);
    this._fileInput?.remove();
    this._destroyEditor();
  }

  private _onSlashImage = () => {
    if (!this._open || !this._editor) return;
    this._triggerImagePicker();
  };

  private _triggerImagePicker() {
    if (!this._fileInput) {
      this._fileInput = document.createElement("input");
      this._fileInput.type = "file";
      this._fileInput.accept = "image/*";
      this._fileInput.style.display = "none";
      this._fileInput.addEventListener("change", () => {
        const file = this._fileInput?.files?.[0];
        if (file && this._editor) {
          this._uploadAndInsertImage(file);
        }
        if (this._fileInput) this._fileInput.value = "";
      });
      document.body.appendChild(this._fileInput);
    }
    this._fileInput.click();
  }

  private async _uploadAndInsertImage(file: File) {
    if (!this._editor) return;

    const placeholderUrl = URL.createObjectURL(file);
    this._editor
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
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const data = (await response.json()) as { url: string };

      // Replace placeholder with real URL
      const { doc } = this._editor.state;
      let replaced = false;
      doc.descendants((node, pos) => {
        if (
          replaced ||
          node.type.name !== "image" ||
          node.attrs.src !== placeholderUrl
        )
          return;
        this._editor
          ?.chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: data.url });
            return true;
          })
          .run();
        replaced = true;
      });
    } catch {
      // Remove placeholder on failure
      const { doc } = this._editor.state;
      doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.src === placeholderUrl) {
          this._editor
            ?.chain()
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

  private _onOpen = (
    e: CustomEvent<{
      json: JSONContent | null;
      title: string;
      showTitle: boolean;
      format?: string;
      labels?: ComposeLabels;
    }>,
  ) => {
    this._content = e.detail.json;
    this._title = e.detail.title;
    if (e.detail.labels) {
      this.labels = e.detail.labels;
    }
    // Always show title in fullscreen — it's the primary editing surface
    this._showTitle = true;
    this._open = true;
    this._actionsOpen = false;
    // Show as modal (top layer) and init editor after render
    this.updateComplete.then(() => {
      const dialog = this.querySelector<HTMLDialogElement>(
        ".compose-fullscreen-dialog",
      );
      if (dialog && !dialog.open) {
        dialog.showModal();
      }
      this._initEditor();
    });
  };

  private _initEditor() {
    const container = this.querySelector<HTMLElement>(
      ".compose-fullscreen .compose-tiptap-body",
    );
    if (!container || this._editor) return;

    this._editor = createTiptapEditor({
      element: container,
      placeholder: this.labels.bodyPlaceholder ?? "Write something…",
      content: this._content,
      onUpdate: (json) => {
        this._content = json;
      },
    });
  }

  private _destroyEditor() {
    this._editor?.destroy();
    this._editor = null;
  }

  private _onDialogCancel = (e: Event) => {
    // Intercept Escape key to save content back instead of just closing
    e.preventDefault();
    this._close();
  };

  private _close() {
    const json = this._editor?.getJSON() ?? this._content;
    this._destroyEditor();

    // Close the modal dialog before Lit removes it from DOM
    const dialog = this.querySelector<HTMLDialogElement>(
      ".compose-fullscreen-dialog",
    );
    dialog?.close();
    this._open = false;

    // Dispatch on document so the compose dialog (a separate subtree) receives it
    document.dispatchEvent(
      new CustomEvent("jant:fullscreen-close", {
        bubbles: true,
        detail: { json, title: this._title },
      }),
    );
  }

  private _toggleActions() {
    this._actionsOpen = !this._actionsOpen;
  }

  private _executeCommand(index: number) {
    const commands = getSlashCommands();
    const item = commands[index];
    if (!item || !this._editor) {
      this._actionsOpen = false;
      return;
    }

    // Image command: trigger file picker directly
    if (item.label === "Image") {
      this._actionsOpen = false;
      this._triggerImagePicker();
      return;
    }

    const { from, to } = this._editor.state.selection;
    item.command(this._editor, { from, to });
    this._actionsOpen = false;
  }

  private _renderActionsMenu() {
    if (!this._actionsOpen) return nothing;
    const commands = getSlashCommands();
    return html`
      <div class="tiptap-slash-menu compose-fullscreen-plus-dropdown">
        ${commands.map(
          (item, i) => html`
            <div
              class="tiptap-slash-item"
              @mousedown=${(e: Event) => {
                e.preventDefault();
                this._executeCommand(i);
              }}
            >
              <span class="tiptap-slash-item-icon">${item.icon}</span>
              <span class="tiptap-slash-item-label">${item.label}</span>
            </div>
          `,
        )}
      </div>
    `;
  }

  render() {
    if (!this._open) return nothing;

    return html`
      <dialog class="compose-fullscreen-dialog" @cancel=${this._onDialogCancel}>
        <div class="compose-fullscreen">
          <div class="compose-fullscreen-toolbar">
            <div class="compose-fullscreen-plus-menu">
              <button
                type="button"
                class="compose-tool-btn"
                @click=${() => this._toggleActions()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <line x1="9" y1="3" x2="9" y2="15" />
                  <line x1="3" y1="9" x2="15" y2="9" />
                </svg>
              </button>
              ${this._renderActionsMenu()}
            </div>
            <div class="flex-1"></div>
            <button
              type="button"
              class="compose-tool-btn"
              @click=${() => this._close()}
            >
              ${this.labels.done || "Done"}
            </button>
          </div>
          <div class="compose-fullscreen-content">
            <div class="compose-fullscreen-inner">
              ${this._showTitle
                ? html`
                    <input
                      type="text"
                      .value=${this._title}
                      @input=${(e: Event) => {
                        this._title = (e.target as HTMLInputElement).value;
                      }}
                      @keydown=${(e: globalThis.KeyboardEvent) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          this._editor?.commands.focus("start");
                        }
                      }}
                      class="compose-fullscreen-title"
                      placeholder=${this.labels.titlePlaceholder ?? "Title"}
                    />
                  `
                : nothing}
              <div class="compose-tiptap-body"></div>
            </div>
          </div>
        </div>
      </dialog>
    `;
  }
}

customElements.define("jant-compose-fullscreen", JantComposeFullscreen);
