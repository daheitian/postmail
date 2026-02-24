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
    homeDefaultView: { type: String, attribute: "home-default-view" },

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
    _pageSearchQuery: { state: true },
  };

  declare items: NavManagerItem[];
  declare labels: NavManagerLabels;
  declare systemNavItems: SystemNavConfig[];
  declare availablePages: AvailablePage[];
  declare siteName: string;
  declare maxVisible: number;
  declare homeDefaultView: string;

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
  declare _pageSearchQuery: string;

  #sortable: { destroy(): void } | null = null;
  #initialized = false;
  #closeOverflow = () => {
    this._showOverflow = false;
    document.removeEventListener("click", this.#closeOverflow);
  };
  #closePagePicker = () => {
    this._showPagePicker = false;
    this._pageSearchQuery = "";
    document.removeEventListener("click", this.#closePagePicker);
  };
  #closeLinkForm = () => {
    this._showLinkForm = false;
    document.removeEventListener("click", this.#closeLinkForm);
  };

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
    this.homeDefaultView = "latest";

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
    this._pageSearchQuery = "";
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
    document.removeEventListener("click", this.#closeOverflow);
    document.removeEventListener("click", this.#closePagePicker);
    document.removeEventListener("click", this.#closeLinkForm);
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
  // Max visible handler
  // ===========================================================================

  async #handleMaxVisibleChange(value: number) {
    const clamped = Math.max(0, Math.min(5, value));
    this.maxVisible = clamped;
    try {
      const res = await fetch("/dash/appearance/nav-max-visible", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: clamped }),
      });
      if (res.ok) showToast(this.labels.maxVisibleSaved);
      else showToast(this.labels.saveFailed, "error");
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
  }

  async #handleHomeViewToggle(useFeatured: boolean) {
    this.homeDefaultView = useFeatured ? "featured" : "latest";
    try {
      const res = await fetch("/dash/appearance/home-default-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: this.homeDefaultView }),
      });
      if (res.ok) showToast(this.labels.homeViewSaved);
      else showToast(this.labels.saveFailed, "error");
    } catch {
      showToast(this.labels.saveFailed, "error");
    }
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
      document.removeEventListener("click", this.#closeLinkForm);
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
      <div class="border rounded-lg">
        <p class="text-xs text-muted-foreground px-4 pt-3">
          ${this.labels.preview}
        </p>
        <div class="px-5 py-3">
          <div class="site-header-top">
            <a href="/" class="site-logo">${this.siteName}</a>
            <div class="site-header-right">
              ${visible.length > 0 || hasMore
                ? html`<nav class="site-header-nav">
                    ${visible.map(
                      (item) =>
                        html`<a href=${item.url} class="site-header-link">
                          ${item.label}
                        </a>`,
                    )}
                    ${hasMore
                      ? html`<div class="dropdown-menu site-header-more">
                          <button
                            type="button"
                            class="site-header-more-btn"
                            aria-haspopup="menu"
                            aria-expanded=${this._showOverflow}
                            @click=${(e: Event) => {
                              e.stopPropagation();
                              this._showOverflow = !this._showOverflow;
                              if (this._showOverflow) {
                                setTimeout(() => {
                                  document.addEventListener(
                                    "click",
                                    this.#closeOverflow,
                                  );
                                });
                              } else {
                                document.removeEventListener(
                                  "click",
                                  this.#closeOverflow,
                                );
                              }
                            }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                          ${this._showOverflow
                            ? html`<div
                                data-popover
                                data-align="end"
                                aria-hidden="false"
                              >
                                <div role="menu">
                                  ${overflow.map(
                                    (item) =>
                                      html`<a href=${item.url} role="menuitem">
                                        ${item.label}
                                      </a>`,
                                  )}
                                </div>
                              </div>`
                            : nothing}
                        </div>`
                      : nothing}
                  </nav>`
                : nothing}
              <span class="site-header-search" aria-hidden="true">
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
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
            </div>
          </div>
          <nav class="site-browse-nav">
            <span class="site-browse-link site-browse-link-active">
              ${this.homeDefaultView === "featured"
                ? this.labels.featured
                : this.labels.latest}
            </span>
            <span class="site-browse-sep" aria-hidden="true">/</span>
            <span class="site-browse-link">
              ${this.homeDefaultView === "featured"
                ? this.labels.latest
                : this.labels.featured}
            </span>
          </nav>
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
        <div class="pb-4 pl-8 flex flex-col gap-3">
          <code class="text-sm text-muted-foreground">${item.url}</code>
          <div class="flex gap-2">
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
        </div>
      `;
    }

    if (item.type === "system") {
      return html`
        <div class="pb-4 pl-8 flex flex-col gap-3">
          <code class="text-sm text-muted-foreground">${item.url}</code>
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
            <button
              type="button"
              class="btn-sm-ghost text-destructive"
              @click=${() => this.#handleDelete(item)}
            >
              ${this.labels.remove}
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
        <div class="flex items-center py-3 gap-2">
          <div
            class="flex items-center gap-3 cursor-grab flex-1 min-w-0"
            data-drag-handle
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
              class="text-muted-foreground shrink-0"
            >
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
            <span class="font-medium truncate">${item.label}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            ${this.#renderTypeBadge(item.type)}
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
        </div>
        ${this.#renderEditPanel(item)}
      </div>
    `;
  }

  #renderAddArea() {
    return html`
      ${this.#renderAddPageSection()} ${this.#renderAddLinkSection()}
    `;
  }

  #renderAddPageSection() {
    const query = this._pageSearchQuery.toLowerCase();
    const filteredPages = query
      ? this._availablePages.filter((p) =>
          (p.title || p.slug).toLowerCase().includes(query),
        )
      : this._availablePages;

    return html`
      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-3">
          ${this.labels.addPageToNavigation}
        </h2>
        <div id="nav-page-select" class="select">
          <button
            type="button"
            class="btn-outline w-full sm:w-[280px]"
            id="nav-page-select-trigger"
            aria-haspopup="listbox"
            aria-expanded=${this._showPagePicker}
            aria-controls="nav-page-select-listbox"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._showPagePicker = !this._showPagePicker;
              this._pageSearchQuery = "";
              if (this._showPagePicker) {
                setTimeout(() => {
                  document.addEventListener("click", this.#closePagePicker);
                  this.querySelector<HTMLInputElement>(
                    "#nav-page-search",
                  )?.focus();
                });
              } else {
                document.removeEventListener("click", this.#closePagePicker);
              }
            }}
          >
            <span class="truncate">${this.labels.choosePage}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-muted-foreground opacity-50 shrink-0"
            >
              <path d="m7 15 5 5 5-5" />
              <path d="m7 9 5-5 5 5" />
            </svg>
          </button>
          ${this._showPagePicker
            ? html`
                <div
                  id="nav-page-select-popover"
                  data-popover
                  aria-hidden="false"
                  class="w-full sm:w-[280px]"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <header>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      type="text"
                      id="nav-page-search"
                      .value=${this._pageSearchQuery}
                      placeholder=${this.labels.searchPages}
                      autocomplete="off"
                      autocorrect="off"
                      spellcheck="false"
                      aria-autocomplete="list"
                      role="combobox"
                      aria-expanded="true"
                      aria-controls="nav-page-select-listbox"
                      aria-labelledby="nav-page-select-trigger"
                      @input=${(e: Event) => {
                        this._pageSearchQuery = (
                          e.target as HTMLInputElement
                        ).value;
                      }}
                    />
                  </header>
                  <div
                    role="listbox"
                    id="nav-page-select-listbox"
                    aria-orientation="vertical"
                    aria-labelledby="nav-page-select-trigger"
                    data-empty=${this.labels.noPagesFound}
                  >
                    ${filteredPages.length > 0
                      ? html`<div class="max-h-64 overflow-y-auto scrollbar">
                          ${filteredPages.map(
                            (page) => html`
                              <div
                                role="option"
                                data-value=${page.id}
                                @click=${() => {
                                  this._showPagePicker = false;
                                  this._pageSearchQuery = "";
                                  document.removeEventListener(
                                    "click",
                                    this.#closePagePicker,
                                  );
                                  this.#handleAddPage(page);
                                }}
                              >
                                ${page.title || page.slug}
                              </div>
                            `,
                          )}
                        </div>`
                      : html`<div
                          class="py-6 text-center text-sm text-muted-foreground"
                        >
                          ${this._availablePages.length === 0
                            ? this.labels.allPagesInNav
                            : this.labels.noPagesFound}
                        </div>`}
                  </div>
                </div>
              `
            : nothing}
        </div>
      </section>
    `;
  }

  #renderAddLinkSection() {
    return html`
      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-3">
          ${this.labels.addCustomLinkToNavigation}
        </h2>
        <div id="nav-link-popover" class="popover">
          <button
            id="nav-link-popover-trigger"
            type="button"
            aria-expanded=${this._showLinkForm}
            aria-controls="nav-link-popover-content"
            class="btn-outline"
            @click=${(e: Event) => {
              e.stopPropagation();
              this._showLinkForm = !this._showLinkForm;
              if (this._showLinkForm) {
                setTimeout(() => {
                  document.addEventListener("click", this.#closeLinkForm);
                });
              } else {
                document.removeEventListener("click", this.#closeLinkForm);
              }
            }}
          >
            ${this.labels.addLink}
          </button>
          ${this._showLinkForm
            ? html`
                <div
                  id="nav-link-popover-content"
                  data-popover
                  data-side="top"
                  aria-hidden="false"
                  class="w-80"
                  style="bottom: 100%; margin-bottom: 0.5rem;"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <div class="grid gap-4">
                    <header class="grid gap-1.5">
                      <h4 class="leading-none font-medium">
                        ${this.labels.addLink}
                      </h4>
                      <p class="text-muted-foreground text-sm">
                        ${this.labels.addLinkDescription}
                      </p>
                    </header>
                    <form
                      class="form grid gap-2"
                      @submit=${(e: Event) => {
                        e.preventDefault();
                        this.#handleAddLink();
                      }}
                    >
                      <div class="grid grid-cols-3 items-center gap-4">
                        <label for="nav-link-label">${this.labels.label}</label>
                        <input
                          type="text"
                          id="nav-link-label"
                          class="col-span-2 h-8"
                          placeholder="Home"
                          required
                          .value=${this._newLinkLabel}
                          @input=${(e: Event) => {
                            this._newLinkLabel = (
                              e.target as HTMLInputElement
                            ).value;
                          }}
                          autofocus
                        />
                      </div>
                      <div class="grid grid-cols-3 items-center gap-4">
                        <label for="nav-link-url">${this.labels.url}</label>
                        <input
                          type="text"
                          id="nav-link-url"
                          class="col-span-2 h-8"
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
                        class="btn-sm mt-2"
                        ?disabled=${this._addingLink}
                      >
                        ${this.labels.addLink}
                      </button>
                    </form>
                  </div>
                </div>
              `
            : nothing}
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

      <div class="flex flex-col gap-3 mt-3">
        <div class="flex items-center gap-3">
          <label class="text-sm" for="nav-max-visible">
            ${this.labels.maxVisibleLinks}
          </label>
          <input
            type="number"
            id="nav-max-visible"
            class="input w-16 h-8"
            min="0"
            max="5"
            .value=${String(this.maxVisible)}
            @change=${(e: Event) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (!isNaN(val)) this.#handleMaxVisibleChange(val);
            }}
          />
        </div>
        <div class="flex items-center gap-3">
          <label class="text-sm" for="nav-home-view">
            ${this.labels.useFeaturedAsDefault}
          </label>
          <input
            type="checkbox"
            role="switch"
            id="nav-home-view"
            class="input"
            .checked=${this.homeDefaultView === "featured"}
            @change=${(e: Event) => {
              this.#handleHomeViewToggle(
                (e.target as HTMLInputElement).checked,
              );
            }}
          />
        </div>
      </div>

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
