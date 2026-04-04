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
    homeDefaultView: { type: String, attribute: "home-default-view" },

    _items: { state: true },
    _editingId: { state: true },
    _editLabel: { state: true },
    _editUrl: { state: true },
    _togglingKeys: { state: true },
    _showLinkForm: { state: true },
    _newLinkLabel: { state: true },
    _newLinkUrl: { state: true },
    _addingLink: { state: true },
  };

  declare items: NavManagerItem[];
  declare labels: NavManagerLabels;
  declare systemNavItems: SystemNavConfig[];
  declare siteName: string;
  declare homeDefaultView: string;

  declare _items: NavManagerItem[];
  declare _editingId: string | null;
  declare _editLabel: string;
  declare _editUrl: string;
  /** Keys currently mid-request (to disable switch during toggle) */
  declare _togglingKeys: Set<SystemNavConfig["key"]>;
  declare _showLinkForm: boolean;
  declare _newLinkLabel: string;
  declare _newLinkUrl: string;
  declare _addingLink: boolean;

  #sortableHeader: { destroy(): void } | null = null;
  #sortableMore: { destroy(): void } | null = null;
  #initialized = false;
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
    this.homeDefaultView = "latest";

    this._items = [];
    this._editingId = null;
    this._editLabel = "";
    this._editUrl = "";
    this._togglingKeys = new Set();
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
    this.#sortableHeader?.destroy();
    this.#sortableHeader = null;
    this.#sortableMore?.destroy();
    this.#sortableMore = null;
    document.removeEventListener("click", this.#closeLinkForm);
  }

  // ===========================================================================
  // SortableJS
  // ===========================================================================

  #destroySortables() {
    this.#sortableHeader?.destroy();
    this.#sortableHeader = null;
    this.#sortableMore?.destroy();
    this.#sortableMore = null;
  }

  #initSortable() {
    const headerList = this.querySelector<HTMLElement>("#nav-items-header");
    const moreList = this.querySelector<HTMLElement>("#nav-items-more");

    if (headerList && !this.#sortableHeader) {
      this.#sortableHeader = Sortable.create(
        headerList,
        this.#sortableOptions("header"),
      );
    }
    if (moreList && !this.#sortableMore) {
      this.#sortableMore = Sortable.create(
        moreList,
        this.#sortableOptions("more"),
      );
    }
  }

  #sortableOptions(placement: "header" | "more"): Sortable.Options {
    return {
      ...responsiveSortableOptions,
      animation: 150,
      handle: "[data-drag-handle]",
      draggable: "[data-nav-id]",
      group: "nav-items",
      onEnd: (evt) => {
        const targetList = evt.to;
        const sourceList = evt.from;
        const crossList = sourceList !== targetList;

        // Determine target placement from the list the item landed in
        const targetPlacement: "header" | "more" =
          targetList.id === "nav-items-header" ? "header" : "more";

        console.log("[nav-drag] onEnd fired", {
          crossList,
          targetPlacement,
          fromId: sourceList.id,
          toId: targetList.id,
          itemNavId: evt.item?.dataset?.navId,
          oldIndex: evt.oldIndex,
          newIndex: evt.newIndex,
        });

        const ids = readSortableDataIds(targetList, "[data-nav-id]", "navId");
        console.log("[nav-drag] target list ids:", ids);

        // Revert DOM in target list; for cross-list moves also revert the
        // removal from the source list (SortableJS moves the DOM node).
        if (crossList) {
          // SortableJS already moved the item into targetList — put it back
          // into sourceList so Lit owns both lists cleanly.
          const item = evt.item;
          item.parentNode?.removeChild(item);
          if (
            evt.oldIndex != null &&
            evt.oldIndex < sourceList.children.length
          ) {
            sourceList.insertBefore(item, sourceList.children[evt.oldIndex]);
          } else {
            sourceList.appendChild(item);
          }
        } else {
          revertSortableDomMove(targetList, evt);
        }

        // Destroy sortables so they don't fight Lit's re-render
        this.#destroySortables();

        // Compute neighbors within the target list
        const movedId =
          evt.item?.dataset?.navId ??
          (evt.newIndex != null ? ids[evt.newIndex] : undefined);
        console.log("[nav-drag] movedId:", movedId);
        if (!movedId) {
          console.log("[nav-drag] EARLY RETURN: no movedId");
          return;
        }

        const movedIndex = ids.indexOf(movedId);
        const afterId = movedIndex > 0 ? (ids[movedIndex - 1] ?? null) : null;
        const beforeId =
          movedIndex < ids.length - 1 ? (ids[movedIndex + 1] ?? null) : null;

        // Update internal state — clone items so Lit detects changes
        const itemMap = new Map(
          this._items.map((i) => [
            i.id,
            i.id === movedId ? { ...i, placement: targetPlacement } : { ...i },
          ]),
        );

        // Rebuild _items: header items in their order, then more items in theirs
        const headerIds = readSortableDataIds(
          this.querySelector<HTMLElement>("#nav-items-header")!,
          "[data-nav-id]",
          "navId",
        );
        const moreIds = readSortableDataIds(
          this.querySelector<HTMLElement>("#nav-items-more")!,
          "[data-nav-id]",
          "navId",
        );

        // For cross-list: the DOM was reverted, so the moved item is still in
        // the source list in the DOM. We need to use the SortableJS-reported
        // ids (from before revert) for the target list.
        if (crossList) {
          // ids = target list order reported by Sortable (includes moved item)
          // Remove movedId from the source placement items
          const sourceIds = targetPlacement === "header" ? moreIds : headerIds;
          const filteredSourceIds = sourceIds.filter((id) => id !== movedId);

          const headerOrder =
            targetPlacement === "header" ? ids : filteredSourceIds;
          const moreOrder =
            targetPlacement === "more" ? ids : filteredSourceIds;

          this._items = [
            ...headerOrder
              .map((id) => itemMap.get(id))
              .filter((i): i is NavManagerItem => i !== undefined),
            ...moreOrder
              .map((id) => itemMap.get(id))
              .filter((i): i is NavManagerItem => i !== undefined),
          ];
        } else {
          // Same-list reorder: just update order for that section
          const otherItems = this._items.filter(
            (i) => (i.placement ?? "header") !== placement,
          );
          const reorderedItems = ids
            .map((id) => itemMap.get(id))
            .filter((i): i is NavManagerItem => i !== undefined);

          this._items =
            placement === "header"
              ? [...reorderedItems, ...otherItems]
              : [...otherItems, ...reorderedItems];
        }

        // Persist placement change if cross-list
        if (crossList) {
          console.log(
            "[nav-drag] cross-list PUT placement:",
            targetPlacement,
            "for",
            movedId,
          );
          fetch(`/api/nav-items/${movedId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ placement: targetPlacement }),
          }).then((res) => {
            console.log("[nav-drag] placement PUT response:", res.status);
            if (res.ok) showToast(this.labels.placementSaved);
            else showToast(this.labels.saveFailed, "error");
          });
        }

        // Persist position
        fetch(`/api/nav-items/${movedId}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            after: afterId ?? null,
            before: beforeId ?? null,
          }),
        }).then((res) => {
          if (res.ok && !crossList) showToast(this.labels.orderSaved);
          else if (!res.ok) showToast(this.labels.saveFailed, "error");
        });
      },
    };
  }

  // ===========================================================================
  // Inline edit handlers
  // ===========================================================================

  #toggleEdit(item: NavManagerItem) {
    if (item.type === "system") return;

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
        body: JSON.stringify({ type: "link", label, url, placement: "header" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const created: NavManagerItem = await res.json();
      this.#destroySortables();
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
      (item) => item.type === "system" && item.systemKey === config.key,
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
            systemKey: config.key,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const created: NavManagerItem = await res.json();
        this.#destroySortables();
        this._items = [
          ...this._items,
          { ...created, displayLabel: config.label },
        ];
      } else {
        const existing = this._items.find(
          (item) => item.type === "system" && item.systemKey === config.key,
        );
        if (existing) {
          const res = await fetch(`/api/nav-items/${existing.id}`, {
            method: "DELETE",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          this.#destroySortables();
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

  get #headerItems(): NavManagerItem[] {
    return this._items.filter((i) => (i.placement ?? "header") === "header");
  }

  get #moreItems(): NavManagerItem[] {
    return this._items.filter((i) => i.placement === "more");
  }

  #renderPreview() {
    const headerItems = this.#headerItems;
    const moreItems = this.#moreItems;

    const defaultLabel =
      this.homeDefaultView === "featured"
        ? this.labels.featured
        : this.labels.latest;
    const altLabel =
      this.homeDefaultView === "featured"
        ? this.labels.latest
        : this.labels.featured;

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
            <nav class="site-header-nav">
              <a class="site-header-link site-header-link-active"
                >${defaultLabel}</a
              >
              <a class="site-header-link">${altLabel}</a>
              ${headerItems.map(
                (item) =>
                  html`<a class="site-header-link">
                    ${item.displayLabel ?? item.label}
                  </a>`,
              )}
              ${moreItems.length > 0
                ? html`<span class="site-header-more-btn"
                    >${this.labels.moreSection}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </span>`
                : nothing}
            </nav>
          </div>
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
          <div
            class="nav-item-info"
            @click=${item.type === "link"
              ? () => this.#toggleEdit(item)
              : undefined}
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-sm font-medium truncate"
                >${item.displayLabel ?? item.label}</span
              >
              ${this.#renderTypeBadge(item.type)}
            </div>
            <span class="text-xs text-muted-foreground truncate"
              >${item.url}</span
            >
          </div>
          ${item.type === "link"
            ? html`<button
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
              </button>`
            : nothing}
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
            const rowClass = toggling
              ? "flex items-center justify-between gap-4 py-3 opacity-60 cursor-not-allowed"
              : "flex items-center justify-between gap-4 py-3 cursor-pointer";
            return html`
              <label class=${rowClass}>
                <div>
                  <p class="font-medium">${config.label}</p>
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
              </label>
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
        <label class="flex items-start justify-between gap-4 cursor-pointer">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">
              ${this.labels.useFeaturedAsDefault}
            </span>
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
        </label>
      </div>

      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-3">${this.labels.headerSection}</h2>
        ${this.#headerItems.length === 0
          ? html`<p class="text-sm text-muted-foreground py-4">
              ${this.labels.emptyState}
            </p>`
          : nothing}
        <div id="nav-items-header" class="nav-items-list">
          ${this.#headerItems.map((item) => this.#renderItem(item))}
        </div>
      </section>

      <section class="mt-8">
        <h2 class="text-lg font-semibold mb-3">${this.labels.moreSection}</h2>
        <div id="nav-items-more" class="nav-items-list nav-items-list-drop">
          ${this.#moreItems.length > 0
            ? this.#moreItems.map((item) => this.#renderItem(item))
            : html`<p class="nav-items-empty-hint">
                ${this.labels.moreEmptyHint}
              </p>`}
        </div>
      </section>

      ${this.#renderAddLinkSection()} ${this.#renderSystemToggles()}
    `;
  }
}

customElements.define("jant-nav-manager", JantNavManager);
