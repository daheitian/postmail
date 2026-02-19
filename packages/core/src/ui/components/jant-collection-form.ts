/**
 * Collection Form Component
 *
 * Handles create/edit collection form interactions:
 * - Maintains form state for title, slug, description, sort order, and icon
 * - Opens the icon picker dialog with search and color presets
 * - Dispatches `jant:collection-submit` for the bridge to POST to the server
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  DEFAULT_ICON_COLOR,
  ICON_COLOR_PRESETS,
  createIconValue,
  parseCollectionIcon,
  renderCollectionIcon,
  getIconSvg,
} from "../../lib/icons.js";
import { ICON_CATALOG } from "../../lib/icon-catalog.js";
import type {
  CollectionFormInitial,
  CollectionFormLabels,
  CollectionSubmitDetail,
} from "./collection-types.js";

type CatalogCategory = {
  name: string;
  icons: Array<{ name: string; svg: string }>;
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class JantCollectionForm extends LitElement {
  static properties = {
    labels: { type: Object },
    initial: { type: Object },
    action: { type: String },
    cancelHref: { type: String, attribute: "cancel-href" },
    isEdit: { type: Boolean, attribute: "is-edit" },

    _title: { state: true },
    _slug: { state: true },
    _description: { state: true },
    _sortOrder: { state: true },
    _iconName: { state: true },
    _iconSvg: { state: true },
    _iconColor: { state: true },
    _iconSearch: { state: true },
    _loading: { state: true },
  };

  declare labels: CollectionFormLabels;
  declare initial: CollectionFormInitial;
  declare action: string;
  declare cancelHref: string;
  declare isEdit: boolean;

  declare _title: string;
  declare _slug: string;
  declare _description: string;
  declare _sortOrder: string;
  declare _iconName: string;
  declare _iconSvg: string;
  declare _iconColor: string;
  declare _iconSearch: string;
  declare _loading: boolean;

  #initialized = false;

  createRenderRoot() {
    this.innerHTML = "";
    return this;
  }

  constructor() {
    super();
    this.labels = {} as CollectionFormLabels;
    this.initial = {
      title: "",
      slug: "",
      description: "",
      sortOrder: "newest",
      icon: "",
    };
    this.action = "";
    this.cancelHref = "/";
    this.isEdit = false;

    this._title = "";
    this._slug = "";
    this._description = "";
    this._sortOrder = "newest";
    this._iconName = "";
    this._iconSvg = "";
    this._iconColor = DEFAULT_ICON_COLOR;
    this._iconSearch = "";
    this._loading = false;
  }

  protected update(
    changedProperties: PropertyValueMap<JantCollectionForm>,
  ): void {
    if (!this.#initialized || changedProperties.has("initial")) {
      this.#applyInitialData();
    }
    super.update(changedProperties);
  }

  set loading(value: boolean) {
    this._loading = value;
  }

  get loading(): boolean {
    return this._loading;
  }

  #applyInitialData() {
    if (!this.initial) return;
    this.#initialized = true;
    this._title = this.initial.title ?? "";
    this._slug = this.initial.slug ?? "";
    this._description = this.initial.description ?? "";
    this._sortOrder = this.initial.sortOrder ?? "newest";

    const parsed = parseCollectionIcon(this.initial.icon ?? "");
    if (parsed) {
      this._iconName = parsed.name;
      this._iconSvg = parsed.svg;
      this._iconColor = parsed.color || DEFAULT_ICON_COLOR;
    } else {
      this._iconName = "";
      this._iconSvg = "";
      this._iconColor = DEFAULT_ICON_COLOR;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const dialog = this.#iconDialog;
    if (dialog?.open) dialog.close();
  }

  get #iconDialog(): HTMLDialogElement | null {
    return this.querySelector<HTMLDialogElement>("#collection-icon-dialog");
  }

  get #iconValue(): string {
    if (this._iconName && this._iconSvg) {
      return createIconValue(
        this._iconName,
        this._iconSvg,
        this._iconColor || DEFAULT_ICON_COLOR,
      );
    }
    return "";
  }

  #filteredCatalog(): CatalogCategory[] {
    const q = this._iconSearch.trim().toLowerCase();
    const result: CatalogCategory[] = [];
    for (const [category, names] of Object.entries(ICON_CATALOG)) {
      const icons = names
        .filter((name) => (q ? name.includes(q) : true))
        .map((name) => {
          const svg = getIconSvg(name);
          return svg ? { name, svg } : null;
        })
        .filter((icon): icon is { name: string; svg: string } => Boolean(icon));
      if (icons.length > 0) {
        result.push({ name: category, icons });
      }
    }
    return result;
  }

  #openDialog() {
    this.#iconDialog?.showModal();
  }

  #closeDialog() {
    this.#iconDialog?.close();
  }

  #handleSubmit(e: Event) {
    e.preventDefault();
    const title = this._title.trim();
    const slug = this._slug.trim();
    if (!title || !slug) {
      return;
    }

    const detail: CollectionSubmitDetail = {
      endpoint: this.action,
      isEdit: this.isEdit,
      data: {
        title,
        slug,
        description: this._description.trim() || undefined,
        icon: this.#iconValue || undefined,
        sortOrder: this._sortOrder || undefined,
      },
    };

    this.dispatchEvent(
      new CustomEvent<CollectionSubmitDetail>("jant:collection-submit", {
        bubbles: true,
        detail,
      }),
    );
  }

  #renderIconPreview() {
    if (this._iconSvg) {
      const htmlString = renderCollectionIcon(this.#iconValue, {
        size: 24,
        fallback: false,
      });
      return html`<span
        class="w-6 h-6 flex items-center justify-center"
        style=${`color:${this._iconColor}`}
      >
        ${unsafeHTML(htmlString)}
      </span>`;
    }
    if (this.initial.icon && !this.initial.icon.startsWith("{")) {
      const htmlString = renderCollectionIcon(this.initial.icon, {
        size: 24,
        fallback: false,
      });
      if (htmlString) {
        return html`<span class="w-6 h-6 flex items-center justify-center">
          ${unsafeHTML(htmlString)}
        </span>`;
      }
    }
    return html`<span class="text-muted-foreground text-lg">?</span>`;
  }

  #renderColorPresets() {
    if (!this._iconSvg) return nothing;
    return html`
      <div class="flex items-center gap-2 mt-2">
        ${ICON_COLOR_PRESETS.map((preset) => {
          const isActive = this._iconColor === preset.value;
          return html`
            <button
              type="button"
              class=${classMap({
                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110": true,
                "ring-2": isActive,
                "ring-offset-1": isActive,
                "ring-primary": isActive,
              })}
              style=${`background-color:${preset.value}; border-color: transparent`}
              title=${preset.name}
              @click=${() => {
                this._iconColor = preset.value;
              }}
            ></button>
          `;
        })}
      </div>
    `;
  }

  #renderIconDialog() {
    const categories = this.#filteredCatalog();
    return html`
      <dialog
        id="collection-icon-dialog"
        class="m-auto rounded-lg border border-border bg-background text-foreground p-0 w-full max-w-md max-h-[80vh] shadow-lg backdrop:bg-black/50"
        @cancel=${() => this.#closeDialog()}
      >
        <div class="flex flex-col max-h-[80vh]">
          <div class="flex flex-col gap-3 p-4 border-b border-border">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">${this.labels.dialogTitle}</h2>
              <button
                type="button"
                class="btn-ghost text-sm"
                @click=${() => this.#closeDialog()}
              >
                ${this.labels.dialogClose}
              </button>
            </div>
            <input
              type="search"
              class="input text-sm"
              placeholder=${this.labels.searchIconsPlaceholder}
              .value=${this._iconSearch}
              @input=${(event: Event) => {
                const target = event.target as HTMLInputElement;
                this._iconSearch = target.value;
              }}
            />
          </div>
          <div class="overflow-y-auto p-4 flex-1">
            ${categories.length === 0
              ? html`<p class="text-sm text-muted-foreground">
                  ${this.labels.searchIconsPlaceholder}
                </p>`
              : categories.map(
                  (category) => html`
                    <div
                      class="flex flex-col gap-2 mb-4"
                      data-category=${category.name}
                    >
                      <h3
                        class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        ${category.name}
                      </h3>
                      <div class="grid grid-cols-8 gap-1">
                        ${category.icons.map(
                          (icon) => html`
                            <button
                              type="button"
                              class=${classMap({
                                "flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent transition-colors": true,
                                "ring-2":
                                  this._iconName === icon.name &&
                                  this._iconSvg === icon.svg,
                                "ring-primary":
                                  this._iconName === icon.name &&
                                  this._iconSvg === icon.svg,
                              })}
                              data-icon-name=${icon.name}
                              @click=${() => {
                                this._iconName = icon.name;
                                this._iconSvg = icon.svg;
                                if (!this._iconColor) {
                                  this._iconColor = DEFAULT_ICON_COLOR;
                                }
                                this._iconSearch = "";
                                this.#closeDialog();
                              }}
                            >
                              <span
                                class="w-5 h-5 flex items-center justify-center"
                              >
                                ${unsafeHTML(
                                  icon.svg
                                    .replace(/width="24"/, 'width="20"')
                                    .replace(/height="24"/, 'height="20"'),
                                )}
                              </span>
                            </button>
                          `,
                        )}
                      </div>
                    </div>
                  `,
                )}
          </div>
        </div>
      </dialog>
    `;
  }

  render() {
    return html`
      <form
        class="flex flex-col gap-4 max-w-lg"
        @submit=${(event: Event) => this.#handleSubmit(event)}
      >
        <div class="field">
          <label class="label">${this.labels.titleLabel}</label>
          <input
            type="text"
            class="input"
            required
            .value=${this._title}
            placeholder=${this.isEdit ? nothing : this.labels.titlePlaceholder}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              this._title = target.value;
              if (!this.isEdit) {
                this._slug = slugifyTitle(target.value);
              }
            }}
          />
        </div>

        <div class="field">
          <label class="label">${this.labels.slugLabel}</label>
          <input
            type="text"
            class="input"
            required
            pattern="[a-z0-9\\-]+"
            .value=${this._slug}
            placeholder=${this.isEdit ? nothing : "my-collection"}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              this._slug = target.value.toLowerCase();
            }}
          />
          ${this.isEdit
            ? nothing
            : html`<p class="text-xs text-muted-foreground mt-1">
                ${this.labels.slugHelp}
              </p>`}
        </div>

        <div class="field">
          <label class="label">${this.labels.descriptionLabel}</label>
          <textarea
            class="textarea"
            rows="3"
            .value=${this._description}
            placeholder=${this.isEdit
              ? nothing
              : this.labels.descriptionPlaceholder}
            @input=${(event: Event) => {
              const target = event.target as HTMLTextAreaElement;
              this._description = target.value;
            }}
          ></textarea>
        </div>

        <div class="field">
          <label class="label">${this.labels.iconLabel}</label>
          <div class="flex items-center gap-3">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-md border border-border"
            >
              ${this.#renderIconPreview()}
            </div>
            <button
              type="button"
              class="btn-outline text-sm"
              @click=${() => this.#openDialog()}
            >
              ${this.labels.chooseIcon}
            </button>
            ${this._iconSvg
              ? html`<button
                  type="button"
                  class="btn-ghost text-sm"
                  @click=${() => {
                    this._iconName = "";
                    this._iconSvg = "";
                    this._iconColor = DEFAULT_ICON_COLOR;
                  }}
                >
                  ${this.labels.removeIcon}
                </button>`
              : nothing}
          </div>
          ${this.#renderColorPresets()}
        </div>

        <div class="field">
          <label class="label">${this.labels.sortOrderLabel}</label>
          <select
            class="select"
            .value=${this._sortOrder}
            @change=${(event: Event) => {
              const target = event.target as HTMLSelectElement;
              this._sortOrder = target.value;
            }}
          >
            <option value="newest">${this.labels.sortNewest}</option>
            <option value="oldest">${this.labels.sortOldest}</option>
            <option value="rating_desc">${this.labels.sortRatingDesc}</option>
            <option value="rating_asc">${this.labels.sortRatingAsc}</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn" ?disabled=${this._loading}>
            ${this._loading
              ? html`<svg
                  class="animate-spin size-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  role="status"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>`
              : nothing}
            ${this.labels.submitLabel}
          </button>
          <a href=${this.cancelHref} class="btn-outline">
            ${this.labels.cancelLabel}
          </a>
        </div>
      </form>

      ${this.#renderIconDialog()}
    `;
  }
}

customElements.define("jant-collection-form", JantCollectionForm);
