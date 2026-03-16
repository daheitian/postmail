/**
 * Navigation Manager Component
 *
 * Manages nav item reordering with a live preview:
 * - Renders a preview bar that reflects current item order
 * - Sortable list with inline edit/delete panels
 * - SortableJS drag-and-drop reorder with immediate preview update
 * - Add link forms
 * - System nav item toggles with immediate list/preview update
 * - Dispatches events for update/delete (handled by bridge)
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import Sortable from "sortablejs";
import {
  getSortableMove,
  readSortableDataIds,
  responsiveSortableOptions,
  revertSortableDomMove,
} from "../sortable-list.js";
import { showToast } from "../toast.js";
import { publicPath } from "../runtime-paths.js";
import type {
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
    siteName: { type: String, attribute: "site-name" },
    maxVisible: { type: Number, attribute: "max-visible" },
    homeDefaultView: { type: String, attribute: "home-default-view" },

    _items: { state: true },
    _editingId: { state: true },
    _editLabel: { state: true },
    _editUrl: { state: true },
    _togglingKeys: { state: true },
    _showOverflow: { state: true },
    _showLinkForm: { state: true },
    _newLinkLabel: { state: true },
    _newLinkUrl: { state: true },
    _addingLink: { state: true },
  };

  declare items: NavManagerItem[];
  declare labels: NavManagerLabels;
  declare systemNavItems: SystemNavConfig[];
  declare siteName: string;
  declare maxVisible: number;
  declare homeDefaultView: string;

  declare _items: NavManagerItem[];
  declare _editingId: string | null;
  declare _editLabel: string;
  declare _editUrl: string;
  /** Keys currently mid-request (to disable switch during toggle) */
  declare _togglingKeys: Set<string>;
  declare _showOverflow: boolean;
  declare _showLinkForm: boolean;
  declare _newLinkLabel: string;
  declare _newLinkUrl: string;
  declare _addingLink: boolean;

  #sortable: { destroy(): void } | null = null;
  #initialized = false;
  #closeOverflow = () => {
    this._showOverflow = false;
    document.removeEventListener("click", this.#closeOverflow);
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
    this.siteName = "";
    this.maxVisible = 2;
    this.homeDefaultView = "latest";

    this._items = [];
    this._editingId = null;
    this._editLabel = "";
    this._editUrl = "";
    this._togglingKeys = new Set();
    this._showOverflow = false;
    this._showLinkForm = false;
    this._newLinkLabel = "";
    this._newLinkUrl = "";
    this._addingLink = false;
  }

  protected update(changedProperties: PropertyValueMap<JantNavManager>): void {
    if (!this.#initialized || changedProperties.has("items")) {
      this._items = [...(this.items ?? [])];
      this.#initialized = true;
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
    document.removeEventListener("click", this.#closeLinkForm);
  }

  // ===========================================================================
  // SortableJS
  // ===========================================================================

  #initSortable() {
    const list = this.querySelector<HTMLElement>("#nav-items-list");
    if (!list || this.#sortable) return;

    this.#sortable = Sortable.create(list, {
      ...responsiveSortableOptions,
      animation: 150,
      handle: "[data-drag-handle]",
      onEnd: (evt) => {
        const ids = readSortableDataIds(list, "[data-nav-id]", "navId");
        revertSortableDomMove(list, evt);

        // Destroy sortable so it doesn't fight Lit's re-render
        this.#sortable?.destroy();
        this.#sortable = null;

        // Find the moved item and compute neighbors
        const { movedId, afterId, beforeId } = getSortableMove(
          ids,
          evt.newIndex,
        );
        if (!movedId) return;

        // Update internal state so Lit re-renders in the new order
        const itemMap = new Map(this._items.map((i) => [i.id, i]));
        this._items = ids
          .map((id) => itemMap.get(id))
          .filter((i): i is NavManagerItem => i !== undefined);

        // Persist to server — single item move
        fetch(`/api/nav-items/${movedId}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            after: afterId ?? null,
            before: beforeId ?? null,
          }),
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
      const res = await fetch("/settings/navigation/nav-max-visible", {
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
      const res = await fetch("/settings/navigation/home-default-view", {
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
  // Add link handler
  // ===========================================================================

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
      <div class="nav-preview">
        <div class="nav-preview-chrome">
          <div class="nav-preview-dots">
            <span></span><span></span><span></span>
          </div>
          <span class="nav-preview-label">${this.labels.preview}</span>
        </div>
        <div class="nav-preview-content">
          <div class="site-header-top">
            <a href=${publicPath("/")} class="site-logo">${this.siteName}</a>
            <div class="site-header-right">
              ${visible.length > 0 || hasMore
                ? html`<nav class="site-header-nav">
                    ${visible.map(
                      (item) =>
                        html`<a
                          href=${publicPath(item.url)}
                          class="site-header-link"
                        >
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
                                      html`<a
                                        href=${publicPath(item.url)}
                                        role="menuitem"
                                      >
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
    const label = type === "system" ? this.labels.system : this.labels.link;
    return html`<span class="badge-secondary">${label}</span>`;
  }

  #renderEditPanel(item: NavManagerItem) {
    if (this._editingId !== item.id) return nothing;

    if (item.type === "link") {
      return html`
        <div class="nav-item-edit">
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
          <div class="flex items-center justify-between">
            <button
              type="button"
              class="btn-sm-ghost text-destructive"
              @click=${() => this.#handleDelete(item)}
            >
              ${this.labels.delete}
            </button>
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

    if (item.type === "system") {
      return html`
        <div class="nav-item-edit">
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
          <div class="flex items-center justify-between">
            <button
              type="button"
              class="btn-sm-ghost text-destructive"
              @click=${() => this.#handleDelete(item)}
            >
              ${this.labels.remove}
            </button>
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
    const isEditing = this._editingId === item.id;

    return html`
      <div
        data-nav-id=${item.id}
        class="nav-item${isEditing ? " nav-item-editing" : ""}"
      >
        <div class="nav-item-row">
          <div class="nav-item-handle" data-drag-handle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
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
          </div>
          <div class="nav-item-info" @click=${() => this.#toggleEdit(item)}>
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium truncate">${item.label}</span>
              ${this.#renderTypeBadge(item.type)}
            </div>
            <span class="text-xs text-muted-foreground truncate"
              >${item.url}</span
            >
          </div>
          <button
            type="button"
            class="nav-item-toggle"
            @click=${() => this.#toggleEdit(item)}
            aria-label=${this.labels.toggleEdit}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="transition: transform 0.15s; ${isEditing
                ? "transform: rotate(180deg);"
                : ""}"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
        ${this.#renderEditPanel(item)}
      </div>
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

      <div class="flex flex-col gap-4 mt-3">
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <label class="text-sm font-medium" for="nav-max-visible">
              ${this.labels.maxVisibleLinks}
            </label>
            <p class="text-xs text-muted-foreground">
              ${this.labels.maxVisibleLinksDescription}
            </p>
          </div>
          <input
            type="number"
            id="nav-max-visible"
            class="input w-16 h-8 shrink-0"
            min="0"
            max="5"
            .value=${String(this.maxVisible)}
            @change=${(e: Event) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              if (!isNaN(val)) this.#handleMaxVisibleChange(val);
            }}
          />
        </div>
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <label class="text-sm font-medium" for="nav-home-view">
              ${this.labels.useFeaturedAsDefault}
            </label>
            <p class="text-xs text-muted-foreground">
              ${this.labels.useFeaturedAsDefaultDescription}
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            id="nav-home-view"
            class="input shrink-0"
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
              <div id="nav-items-list" class="nav-items-list">
                ${this._items.map((item) => this.#renderItem(item))}
              </div>
            `}
      </section>

      ${this.#renderAddLinkSection()} ${this.#renderSystemToggles()}
    `;
  }
}

customElements.define("jant-nav-manager", JantNavManager);
