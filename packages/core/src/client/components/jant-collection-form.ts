/**
 * Collection Form Component
 *
 * Handles create/edit collection form interactions:
 * - Maintains form state for title, slug, description, sort order, and icon
 * - Notion-style inline icon trigger with anchored popover (Icons + Emojis tabs)
 * - Color presets that instantly recolor all icon previews
 * - Default "library" icon in create mode
 * - Dispatches `jant:collection-submit` for the bridge to POST to the server
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  DEFAULT_ICON_PALETTE,
  DEFAULT_ICON_NAME,
  createIconValue,
  parseCollectionIcon,
  renderCollectionIcon,
  getIconSvg,
} from "../../lib/icons.js";
import {
  ICON_COLOR_PRESETS,
  getCollectionIconColorVar,
  type CollectionIconPalette,
} from "../../lib/collection-icon-palette.js";
import { ALL_ICON_NAMES, ALL_ICON_CATEGORIES } from "../../lib/icon-catalog.js";
import { EMOJI_CATALOG } from "../../lib/emoji-catalog.js";
import { slugify } from "../lazy-slugify.js";
import type {
  CollectionFormInitial,
  CollectionFormLabels,
  CollectionSubmitDetail,
} from "./collection-types.js";

type CatalogCategory = {
  name: string;
  icons: Array<{ name: string; svg: string }>;
};

type EmojiCategory = {
  name: string;
  emojis: string[];
};

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
    _iconPalette: { state: true },
    _iconEmoji: { state: true },
    _iconSearch: { state: true },
    _pickerOpen: { state: true },
    _pickerTab: { state: true },
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
  declare _iconPalette: CollectionIconPalette;
  declare _iconEmoji: string;
  declare _iconSearch: string;
  declare _pickerOpen: boolean;
  declare _pickerTab: "icons" | "emojis";
  declare _loading: boolean;

  #initialized = false;
  #svgCache = new Map<string, string>();

  #getCachedSvg(name: string): string | null {
    const cached = this.#svgCache.get(name);
    if (cached !== undefined) return cached;
    const svg = getIconSvg(name);
    if (svg) this.#svgCache.set(name, svg);
    return svg;
  }

  #closePickerHandler = (e: Event) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const pickerEl = this.querySelector<HTMLElement>("[data-icon-picker]");
    const triggerEl = this.querySelector<HTMLElement>("[data-icon-trigger]");
    if (
      pickerEl &&
      !pickerEl.contains(target) &&
      triggerEl &&
      !triggerEl.contains(target)
    ) {
      this._pickerOpen = false;
    }
  };

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
    this._iconPalette = DEFAULT_ICON_PALETTE;
    this._iconEmoji = "";
    this._iconSearch = "";
    this._pickerOpen = false;
    this._pickerTab = "icons";
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

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("click", this.#closePickerHandler, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.#closePickerHandler, true);
  }

  #applyInitialData() {
    if (!this.initial) return;
    this.#initialized = true;
    this._title = this.initial.title ?? "";
    this._slug = this.initial.slug ?? "";
    this._description = this.initial.description ?? "";
    this._sortOrder = this.initial.sortOrder ?? "newest";

    const rawIcon = this.initial.icon ?? "";
    const parsed = parseCollectionIcon(rawIcon);
    if (parsed) {
      this._iconName = parsed.name;
      this._iconSvg = parsed.svg;
      this._iconPalette = parsed.palette;
      this._iconEmoji = "";
    } else if (rawIcon && !rawIcon.startsWith("{")) {
      // Legacy emoji value
      this._iconEmoji = rawIcon;
      this._iconName = "";
      this._iconSvg = "";
      this._iconPalette = DEFAULT_ICON_PALETTE;
    } else {
      this._iconName = "";
      this._iconSvg = "";
      this._iconPalette = DEFAULT_ICON_PALETTE;
      this._iconEmoji = "";
      // Default icon in create mode
      if (!this.isEdit) {
        this.#applyDefaultIcon();
      }
    }
  }

  #applyDefaultIcon() {
    const svg = getIconSvg(DEFAULT_ICON_NAME);
    if (svg) {
      this._iconName = DEFAULT_ICON_NAME;
      this._iconSvg = svg;
      this._iconPalette = DEFAULT_ICON_PALETTE;
    }
  }

  get #iconValue(): string {
    if (this._iconEmoji) {
      return this._iconEmoji;
    }
    if (this._iconName && this._iconSvg) {
      return createIconValue(
        this._iconName,
        this._iconSvg,
        this._iconPalette || DEFAULT_ICON_PALETTE,
      );
    }
    return "";
  }

  #allIconsByCategory: CatalogCategory[] | null = null;

  #getAllIconsByCategory(): CatalogCategory[] {
    if (this.#allIconsByCategory) return this.#allIconsByCategory;
    const result: CatalogCategory[] = [];
    for (const [category, names] of Object.entries(ALL_ICON_CATEGORIES)) {
      const icons = names
        .map((name) => {
          const svg = this.#getCachedSvg(name);
          return svg ? { name, svg } : null;
        })
        .filter((icon): icon is { name: string; svg: string } => Boolean(icon));
      if (icons.length > 0) {
        result.push({ name: category, icons });
      }
    }
    this.#allIconsByCategory = result;
    return result;
  }

  #filteredCatalog(): CatalogCategory[] {
    const q = this._iconSearch.trim().toLowerCase();

    if (!q) {
      // No search → show all icons grouped by official category
      return this.#getAllIconsByCategory();
    }

    // Search → filter ALL icon names + category names
    const matching = ALL_ICON_NAMES.filter((name) => name.includes(q));
    if (matching.length === 0) return [];

    const icons = matching
      .map((name) => {
        const svg = this.#getCachedSvg(name);
        return svg ? { name, svg } : null;
      })
      .filter((icon): icon is { name: string; svg: string } => Boolean(icon));

    if (icons.length === 0) return [];
    return [{ name: "results", icons }];
  }

  #filteredEmojiCatalog(): EmojiCategory[] {
    const q = this._iconSearch.trim().toLowerCase();
    const result: EmojiCategory[] = [];
    for (const [category, emojis] of Object.entries(EMOJI_CATALOG)) {
      if (q && !category.includes(q)) continue;
      result.push({ name: category, emojis });
    }
    return result;
  }

  #togglePicker(e: Event) {
    e.stopPropagation();
    this._pickerOpen = !this._pickerOpen;
    this._iconSearch = "";
  }

  #selectIcon(name: string, svg: string) {
    this._iconName = name;
    this._iconSvg = svg;
    this._iconEmoji = "";
    if (!this._iconPalette) {
      this._iconPalette = DEFAULT_ICON_PALETTE;
    }
    this._iconSearch = "";
    this._pickerOpen = false;
  }

  #selectEmoji(emoji: string) {
    this._iconEmoji = emoji;
    this._iconName = "";
    this._iconSvg = "";
    this._iconSearch = "";
    this._pickerOpen = false;
  }

  #removeIcon() {
    this._iconName = "";
    this._iconSvg = "";
    this._iconPalette = DEFAULT_ICON_PALETTE;
    this._iconEmoji = "";
    this._pickerOpen = false;
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

  #renderTriggerIcon() {
    if (this._iconEmoji) {
      return html`<span class="text-lg leading-none">${this._iconEmoji}</span>`;
    }
    if (this._iconSvg) {
      const htmlString = renderCollectionIcon(this.#iconValue, {
        size: 20,
        fallback: false,
      });
      return html`<span
        class="w-5 h-5 flex items-center justify-center"
        style=${`color:${getCollectionIconColorVar(this._iconPalette)}`}
      >
        ${unsafeHTML(htmlString)}
      </span>`;
    }
    return html`<span class="text-muted-foreground text-base">+</span>`;
  }

  #renderInlineIconTrigger() {
    return html`
      <button
        type="button"
        data-icon-trigger
        class="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors z-10"
        @click=${(e: Event) => this.#togglePicker(e)}
      >
        ${this.#renderTriggerIcon()}
      </button>
    `;
  }

  #renderPickerColorPresets() {
    return html`
      <div class="flex items-center gap-1.5 px-3 pb-2">
        ${ICON_COLOR_PRESETS.map((preset) => {
          const isActive = this._iconPalette === preset.name;
          return html`
            <button
              type="button"
              class=${`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110${isActive ? " ring-2 ring-offset-1 ring-primary" : ""}`}
              style=${`background-color:${getCollectionIconColorVar(preset.name)}; border-color: transparent`}
              title=${preset.name}
              @click=${() => {
                this._iconPalette = preset.name;
              }}
            ></button>
          `;
        })}
      </div>
    `;
  }

  #renderIconsGrid() {
    const categories = this.#filteredCatalog();
    if (categories.length === 0) {
      return html`<p class="text-sm text-muted-foreground px-3 py-2">
        No icons found
      </p>`;
    }
    return categories.map(
      (category) => html`
        <div class="flex flex-col gap-1.5 mb-3" data-category=${category.name}>
          <h3
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3"
          >
            ${category.name}
          </h3>
          <div class="grid grid-cols-8 gap-0.5 px-2">
            ${category.icons.map(
              (icon) => html`
                <button
                  type="button"
                  class=${`flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors${this._iconName === icon.name && this._iconSvg === icon.svg && !this._iconEmoji ? " ring-2 ring-primary" : ""}`}
                  data-icon-name=${icon.name}
                  title=${icon.name}
                  style=${`color:${getCollectionIconColorVar(this._iconPalette)}`}
                  @click=${() => this.#selectIcon(icon.name, icon.svg)}
                >
                  <span class="w-4 h-4 flex items-center justify-center">
                    ${unsafeHTML(
                      icon.svg
                        .replace(/width="24"/, 'width="16"')
                        .replace(/height="24"/, 'height="16"'),
                    )}
                  </span>
                </button>
              `,
            )}
          </div>
        </div>
      `,
    );
  }

  #renderEmojisGrid() {
    const categories = this.#filteredEmojiCatalog();
    if (categories.length === 0) {
      return html`<p class="text-sm text-muted-foreground px-3 py-2">
        No emojis found
      </p>`;
    }
    return categories.map(
      (category) => html`
        <div class="flex flex-col gap-1.5 mb-3" data-category=${category.name}>
          <h3
            class="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3"
          >
            ${category.name}
          </h3>
          <div class="grid grid-cols-8 gap-0.5 px-2">
            ${category.emojis.map(
              (emoji) => html`
                <button
                  type="button"
                  class=${`flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors text-lg${this._iconEmoji === emoji ? " ring-2 ring-primary" : ""}`}
                  @click=${() => this.#selectEmoji(emoji)}
                >
                  ${emoji}
                </button>
              `,
            )}
          </div>
        </div>
      `,
    );
  }

  #renderIconPopover() {
    if (!this._pickerOpen) return nothing;

    const isIconsTab = this._pickerTab === "icons";
    const searchPlaceholder = isIconsTab
      ? this.labels.searchIconsPlaceholder
      : this.labels.searchEmojisPlaceholder;
    const hasIcon = this._iconSvg || this._iconEmoji;

    return html`
      <div
        data-icon-picker
        class="absolute left-0 top-full mt-1 z-50 w-80 rounded-lg border border-border bg-background shadow-lg"
      >
        <!-- Tabs -->
        <div class="flex border-b border-border">
          <button
            type="button"
            class=${`flex-1 px-3 py-2 text-sm font-medium transition-colors ${isIconsTab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            @click=${() => {
              this._pickerTab = "icons";
              this._iconSearch = "";
            }}
          >
            ${this.labels.iconsTab}
          </button>
          <button
            type="button"
            class=${`flex-1 px-3 py-2 text-sm font-medium transition-colors ${!isIconsTab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            @click=${() => {
              this._pickerTab = "emojis";
              this._iconSearch = "";
            }}
          >
            ${this.labels.emojisTab}
          </button>
        </div>

        <!-- Color presets (icons tab only) -->
        ${isIconsTab
          ? html`<div class="pt-2">${this.#renderPickerColorPresets()}</div>`
          : nothing}

        <!-- Search -->
        <div class="px-3 py-2">
          <input
            type="search"
            class="input text-sm w-full"
            placeholder=${searchPlaceholder}
            .value=${this._iconSearch}
            @input=${(event: Event) => {
              const target = event.target as HTMLInputElement;
              this._iconSearch = target.value;
            }}
          />
        </div>

        <!-- Grid -->
        <div class="overflow-y-auto max-h-80">
          ${isIconsTab ? this.#renderIconsGrid() : this.#renderEmojisGrid()}
        </div>

        <!-- Remove button -->
        ${hasIcon
          ? html`
              <div class="border-t border-border px-3 py-2">
                <button
                  type="button"
                  class="btn-ghost text-sm w-full"
                  @click=${() => this.#removeIcon()}
                >
                  ${this.labels.removeIcon}
                </button>
              </div>
            `
          : nothing}
      </div>
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
          <div class="relative">
            ${this.#renderInlineIconTrigger()}
            <input
              type="text"
              class="input pl-12"
              data-collection-title-input
              required
              .value=${this._title}
              placeholder=${this.isEdit
                ? nothing
                : this.labels.titlePlaceholder}
              @input=${(event: Event) => {
                const target = event.target as HTMLInputElement;
                this._title = target.value;
                if (!this.isEdit) {
                  const currentTitle = target.value;
                  slugify(currentTitle).then((slug) => {
                    if (this._title === currentTitle) {
                      this._slug = slug;
                    }
                  });
                }
              }}
            />
            ${this.#renderIconPopover()}
          </div>
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
    `;
  }
}

customElements.define("jant-collection-form", JantCollectionForm);
