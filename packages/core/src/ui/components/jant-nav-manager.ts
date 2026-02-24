/**
 * Navigation Manager Component
 *
 * Manages nav item reordering with a live preview:
 * - Renders a preview bar that reflects current item order
 * - Sortable list with inline edit/delete panels
 * - SortableJS drag-and-drop reorder with immediate preview update
 * - Add page/link forms
 * - System nav item toggles with immediate list/preview update
 * - Dispatches events for update/delete (handled by bridge)
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import Sortable from "sortablejs";
import { showToast } from "../../lib/toast.js";
import type {
  AvailablePage,
  NavManagerItem,
  NavManagerLabels,
  NavManagerUpdateDetail,
  NavManagerDeleteDetail,
  SystemNavConfig,
} from "./nav-manager-types.js";

export class JantNavManager extends LitElement {
  static properties = {
    items: { type: Array },
    labels: { type: Object },
    systemNavItems: { type: Array, attribute: "system-nav-items" },
    availablePages: { type: Array, attribute: "available-pages" },
    siteName: { type: String, attribute: "site-name" },
    maxVisible: { type: Number, attribute: "max-visible" },

    _items: { state: true },
    _editingId: { state: true },
    _editLabel: { state: true },
    _editUrl: { state: true },
    _togglingKeys: { state: true },
    _showOverflow: { state: true },
    _showPagePicker: { state: true },
    _showLinkForm: { state: true },
    _newLinkLabel: { state: true },
    _newLinkUrl: { state: true },
    _availablePages: { state: true },
    _addingPageId: { state: true },
    _addingLink: { state: true },
  };

  declare items: NavManagerItem[];
  declare labels: NavManagerLabels;
  declare systemNavItems: SystemNavConfig[];
  declare availablePages: AvailablePage[];
  declare siteName: string;
  declare maxVisible: number;

  declare _items: NavManagerItem[];
  declare _editingId: number | null;
  declare _editLabel: string;
  declare _editUrl: string;
  /** Keys currently mid-request (to disable switch during toggle) */
  declare _togglingKeys: Set<string>;
  declare _showOverflow: boolean;
  declare _showPagePicker: boolean;
  declare _showLinkForm: boolean;
  declare _newLinkLabel: string;
  declare _newLinkUrl: string;
  declare _availablePages: AvailablePage[];
  /** Page ID currently being added (to disable its button) */
  declare _addingPageId: number | null;
  declare _addingLink: boolean;

  #sortable: { destroy(): void } | null = null;
  #initialized = false;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.items = [];
    this.labels = {} as NavManagerLabels;
    this.systemNavItems = [];
    this.availablePages = [];
    this.siteName = "";
    this.maxVisible = 3;

    this._items = [];
    this._editingId = null;
    this._editLabel = "";
    this._editUrl = "";
    this._togglingKeys = new Set();
    this._showOverflow = false;
    this._showPagePicker = false;
    this._showLinkForm = false;
    this._newLinkLabel = "";
    this._newLinkUrl = "";
    this._availablePages = [];
    this._addingPageId = null;
    this._addingLink = false;
  }

  protected update(changedProperties: PropertyValueMap<JantNavManager>): void {
    if (!this.#initialized || changedProperties.has("items")) {
      this._items = [...(this.items ?? [])];
      this.#initialized = true;
    }
    if (changedProperties.has("availablePages" as keyof JantNavManager)) {
      this._availablePages = [...(this.availablePages ?? [])];
    }
    super.update(changedProperties);
  }

  protected updated(): void {
    this.#initSortable();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#sortable?.destroy();
    this.#sortable = null;
  }

  // ===========================================================================
  // SortableJS
  // ===========================================================================

  #initSortable() {
    const list = this.querySelector<HTMLElement>("#nav-items-list");
    if (!list || this.#sortable) return;

    this.#sortable = Sortable.create(list, {
      animation: 150,
      handle: "[data-drag-handle]",
      onEnd: (evt) => {
        // Read new order from DOM BEFORE reverting
        const els = [...list.querySelectorAll<HTMLElement>("[data-nav-id]")];
        const ids = els.map((el) => Number(el.dataset.navId));

        // Revert SortableJS DOM manipulation so Lit can re-render cleanly.
        // SortableJS physically moved the element — put it back where it was.
        const { item, oldIndex, newIndex } = evt;
        if (oldIndex != null && newIndex != null && oldIndex !== newIndex) {
          // Remove the item from its new position
          item.parentNode?.removeChild(item);
          // Re-insert at the original position
          const children = list.children;
          if (oldIndex >= children.length) {
            list.appendChild(item);
          } else {
            list.insertBefore(item, children[oldIndex]);
          }
        }

        // Destroy sortable so it doesn't fight Lit's re-render
        this.#sortable?.destroy();
        this.#sortable = null;

        // Update internal state so Lit re-renders in the new order
        const itemMap = new Map(this._items.map((i) => [i.id, i]));
        this._items = ids
          .map((id) => itemMap.get(id))
          .filter((i): i is NavManagerItem => i !== undefined);

        // Persist to server
        fetch("/api/nav-items/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        }).then((res) => {
          if (res.ok) showToast(this.labels.orderSaved);
          else showToast(this.labels.saveFailed, "error");
        });
      },
    });
  }

  // ===========================================================================
  // Inline edit handlers
  // ===========================================================================

  #toggleEdit(item: NavManagerItem) {
    if (this._editingId === item.id) {
      this._editingId = null;
    } else {
      this._editingId = item.id;
      this._editLabel = item.label;
      this._editUrl = item.url;
    }
  }

  #handleUpdate(item: NavManagerItem) {
    const label = this._editLabel.trim();
    if (!label) {
      showToast(this.labels.labelRequired, "error");
      return;
    }

    const detail: NavManagerUpdateDetail = {
      id: item.id,
      label,
      ...(item.type === "link" && { url: this._editUrl.trim() }),
    };

    this.dispatchEvent(
      new CustomEvent<NavManagerUpdateDetail>("jant:nav-update", {
        bubbles: true,
        detail,
      }),
    );
  }

  #handleDelete(item: NavManagerItem) {
    this.dispatchEvent(
      new CustomEvent<NavManagerDeleteDetail>("jant:nav-delete", {
        bubbles: true,
        detail: { id: item.id },
      }),
    );
  }

  // ===========================================================================
  // Add page / link handlers
  // ===========================================================================

  async #handleAddPage(page: AvailablePage) {
    this._addingPageId = page.id;
    try {
      const res = await fetch("/api/nav-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          type: "page",
          label: page.title || page.slug,
          url: `/${page.slug}`,
          pageId: page.id,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const created: NavManagerItem = await res.json();
      this.#sortable?.destroy();
      this.#sortable = null;
      this._items = [...this._items, created];
      this._availablePages = this._availablePages.filter(
        (p) => p.id !== page.id,
      );
    } catch {
      showToast(this.labels.saveFailed, "error");
    } finally {
      this._addingPageId = null;
    }
  }

  async #handleAddLink() {
    const label = this._newLinkLabel.trim();
    const url = this._newLinkUrl.trim();
    if (!label || !url) {
      showToast(this.labels.labelAndUrlRequired, "error");
      return;
    }

    this._addingLink = true;
    try {
      const res = await fetch("/api/nav-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ type: "link", label, url }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const created: NavManagerItem = await res.json();
      this.#sortable?.destroy();
      this.#sortable = null;
      this._items = [...this._items, created];
      this._newLinkLabel = "";
      this._newLinkUrl = "";
      this._showLinkForm = false;
    } catch {
      showToast(this.labels.saveFailed, "error");
    } finally {
      this._addingLink = false;
    }
  }

  // ===========================================================================
  // System toggle handlers
  // ===========================================================================

  #isSystemEnabled(config: SystemNavConfig): boolean {
    return this._items.some(
      (item) => item.type === "system" && item.url === config.url,
    );
  }

  async #handleSystemToggle(config: SystemNavConfig, enabled: boolean) {
    this._togglingKeys = new Set([...this._togglingKeys, config.key]);

    try {
      if (enabled) {
        const res = await fetch("/api/nav-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            type: "system",
            label: config.defaultLabel,
            url: config.url,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const created: NavManagerItem = await res.json();
        this.#sortable?.destroy();
        this.#sortable = null;
        this._items = [...this._items, created];
      } else {
        const existing = this._items.find(
          (item) => item.type === "system" && item.url === config.url,
        );
        if (existing) {
          const res = await fetch(`/api/nav-items/${existing.id}`, {
            method: "DELETE",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          this.#sortable?.destroy();
          this.#sortable = null;
          this._items = this._items.filter((item) => item.id !== existing.id);
        }
      }
    } catch {
      showToast(this.labels.saveFailed, "error");
      this.requestUpdate();
    } finally {
      const next = new Set(this._togglingKeys);
      next.delete(config.key);
      this._togglingKeys = next;
    }
  }

  // ===========================================================================
  // Render helpers
  // ===========================================================================

  #renderPreview() {
    const visible = this._items.slice(0, this.maxVisible);
    const overflow = this._items.slice(this.maxVisible);
    const hasMore = overflow.length > 0;

    return html`
      <div class="border rounded-lg p-4 bg-muted/30">
        <p class="text-xs text-muted-foreground mb-3">${this.labels.preview}</p>
        <div class="flex items-center justify-between">
          <span class="font-semibold">${this.siteName}</span>
          <div class="flex items-center gap-3 text-sm">
            ${visible.map(
              (item) =>
                html`<span class="text-muted-foreground">${item.label}</span>`,
            )}
            ${hasMore
              ? html`<span class="relative">
                  <button
                    type="button"
                    class="text-muted-foreground hover:text-foreground transition-colors"
                    @click=${() => {
                      this._showOverflow = !this._showOverflow;
                    }}
                  >
                    ...
                  </button>
                  ${this._showOverflow
                    ? html`<div
                        class="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-md p-2 min-w-[120px] z-10"
                      >
                        ${overflow.map(
                          (item) =>
                            html`<div
                              class="px-2 py-1 text-sm text-muted-foreground"
                            >
                              ${item.label}
                            </div>`,
                        )}
                      </div>`
                    : nothing}
                </span>`
              : nothing}
          </div>
        </div>
      </div>
    `;
  }

  #renderTypeBadge(type: string) {
    const label =
      type === "page"
        ? this.labels.page
        : type === "system"
          ? this.labels.system
          : this.labels.link;
    return html`<span class="badge-secondary">${label}</span>`;
  }

  #renderEditPanel(item: NavManagerItem) {
    if (this._editingId !== item.id) return nothing;

    if (item.type === "link") {
      return html`
        <div class="pb-4 pl-8 flex flex-col gap-3">
          <div class="field">
            <label class="label">${this.labels.label}</label>
            <input
              type="text"
              class="input"
              required
              .value=${this._editLabel}
              @input=${(e: Event) => {
                this._editLabel = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <div class="field">
            <label class="label">${this.labels.url}</label>
            <input
              type="text"
              class="input"
              required
              .value=${this._editUrl}
              @input=${(e: Event) => {
                this._editUrl = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-sm"
              @click=${() => this.#handleUpdate(item)}
            >
              ${this.labels.save}
            </button>
            <button
              type="button"
              class="btn-sm-ghost text-destructive"
              @click=${() => this.#handleDelete(item)}
            >
              ${this.labels.delete}
            </button>
          </div>
        </div>
      `;
    }

    if (item.type === "page") {
      return html`
        <div class="pb-4 pl-8 flex gap-2">
          ${item.pageId
            ? html`<a
                href=${`/dash/pages/${item.pageId}/edit`}
                class="btn-sm-outline"
                >${this.labels.editPage}</a
              >`
            : nothing}
          <button
            type="button"
            class="btn-sm-ghost text-destructive"
            @click=${() => this.#handleDelete(item)}
          >
            ${this.labels.remove}
          </button>
        </div>
      `;
    }

    if (item.type === "system") {
      return html`
        <div class="pb-4 pl-8 flex flex-col gap-3">
          <div class="field">
            <label class="label">${this.labels.label}</label>
            <input
              type="text"
              class="input"
              required
              .value=${this._editLabel}
              @input=${(e: Event) => {
                this._editLabel = (e.target as HTMLInputElement).value;
              }}
            />
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn-sm"
              @click=${() => this.#handleUpdate(item)}
            >
              ${this.labels.save}
            </button>
          </div>
        </div>
      `;
    }

    return nothing;
  }

  #renderItem(item: NavManagerItem) {
    return html`
      <div data-nav-id=${item.id}>
        <div class="flex items-center justify-between py-3">
          <div class="flex items-center gap-3 cursor-grab" data-drag-handle>
            <span class="text-muted-foreground select-none">⠇</span>
            <div class="flex items-center gap-2">
              <span class="font-medium">${item.label}</span>
              <code class="text-sm text-muted-foreground bg-muted px-1 rounded"
                >${item.url}</code
              >
              ${this.#renderTypeBadge(item.type)}
            </div>
          </div>
          <button
            type="button"
            class="btn-sm-ghost"
            @click=${() => this.#toggleEdit(item)}
            aria-label=${this.labels.toggleEdit}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        ${this.#renderEditPanel(item)}
      </div>
    `;
  }

  #renderAddArea() {
    return html`
      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-3">
          ${this.labels.addToNavigation}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Pages card -->
          <div>
            <button
              type="button"
              class="card w-full text-left p-4 hover:bg-muted/50 transition-colors"
              @click=${() => {
                this._showPagePicker = !this._showPagePicker;
              }}
            >
              <p class="font-medium">${this.labels.addPage}</p>
              <p class="text-sm text-muted-foreground">
                ${this.labels.addPageDescription}
              </p>
            </button>
            ${this._showPagePicker
              ? html`<div class="mt-2 border rounded-lg p-3">
                  ${this._availablePages.length === 0
                    ? html`<p class="text-sm text-muted-foreground">
                        ${this.labels.allPagesInNav}
                      </p>`
                    : html`<div class="flex flex-col divide-y">
                        ${this._availablePages.map(
                          (page) => html`
                            <div class="flex items-center justify-between py-2">
                              <span class="text-sm"
                                >${page.title || page.slug}</span
                              >
                              <button
                                type="button"
                                class="btn-sm-outline"
                                ?disabled=${this._addingPageId === page.id}
                                @click=${() => this.#handleAddPage(page)}
                              >
                                ${this.labels.add}
                              </button>
                            </div>
                          `,
                        )}
                      </div>`}
                </div>`
              : nothing}
          </div>

          <!-- Custom Link card -->
          <div>
            <button
              type="button"
              class="card w-full text-left p-4 hover:bg-muted/50 transition-colors"
              @click=${() => {
                this._showLinkForm = !this._showLinkForm;
              }}
            >
              <p class="font-medium">${this.labels.addLink}</p>
              <p class="text-sm text-muted-foreground">
                ${this.labels.addLinkDescription}
              </p>
            </button>
            ${this._showLinkForm
              ? html`<div class="mt-2 border rounded-lg p-3">
                  <form
                    class="flex flex-col gap-3"
                    @submit=${(e: Event) => {
                      e.preventDefault();
                      this.#handleAddLink();
                    }}
                  >
                    <div class="field">
                      <label class="label">${this.labels.label}</label>
                      <input
                        type="text"
                        class="input"
                        placeholder="Home"
                        required
                        .value=${this._newLinkLabel}
                        @input=${(e: Event) => {
                          this._newLinkLabel = (
                            e.target as HTMLInputElement
                          ).value;
                        }}
                      />
                    </div>
                    <div class="field">
                      <label class="label">${this.labels.url}</label>
                      <input
                        type="text"
                        class="input"
                        placeholder=${this.labels.urlPlaceholder}
                        required
                        .value=${this._newLinkUrl}
                        @input=${(e: Event) => {
                          this._newLinkUrl = (
                            e.target as HTMLInputElement
                          ).value;
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      class="btn-sm"
                      ?disabled=${this._addingLink}
                    >
                      ${this.labels.addLink}
                    </button>
                  </form>
                </div>`
              : nothing}
          </div>
        </div>
      </section>
    `;
  }

  #renderSystemToggles() {
    if (!this.systemNavItems?.length) return nothing;

    return html`
      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-1">${this.labels.systemLinks}</h2>
        <p class="text-sm text-muted-foreground mb-3">
          ${this.labels.systemLinksDescription}
        </p>
        <div class="flex flex-col divide-y">
          ${this.systemNavItems.map((config) => {
            const enabled = this.#isSystemEnabled(config);
            const toggling = this._togglingKeys.has(config.key);
            return html`
              <div class="flex items-center justify-between py-3">
                <div>
                  <p class="font-medium">${config.defaultLabel}</p>
                  <p class="text-sm text-muted-foreground">
                    ${config.description}
                  </p>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  class="input"
                  .checked=${enabled}
                  ?disabled=${toggling}
                  @change=${(e: Event) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    this.#handleSystemToggle(config, checked);
                  }}
                />
              </div>
            `;
          })}
        </div>
      </section>
    `;
  }

  render() {
    return html`
      ${this.#renderPreview()}

      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-3">
          ${this.labels.navigationItems}
        </h2>
        ${this._items.length === 0
          ? html`<p class="text-sm text-muted-foreground py-4">
              ${this.labels.emptyState}
            </p>`
          : html`
              <div id="nav-items-list" class="flex flex-col divide-y">
                ${this._items.map((item) => this.#renderItem(item))}
              </div>
            `}
      </section>

      ${this.#renderAddArea()} ${this.#renderSystemToggles()}
    `;
  }
}

customElements.define("jant-nav-manager", JantNavManager);
