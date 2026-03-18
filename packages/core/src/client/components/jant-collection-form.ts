/**
 * Collection Form Component
 *
 * Handles create/edit collection form interactions for:
 * - title, slug, description, and sort order
 * - quick-create slug preview/editing
 * - dispatching `jant:collection-submit` for the bridge layer
 *
 * Light DOM only — BaseCoat and Tailwind classes apply directly.
 */

import { LitElement, html, nothing } from "lit";
import type { PropertyValueMap } from "lit";
import { getSlugValidationIssue } from "../../lib/slug-format.js";
import { slugify } from "../lazy-slugify.js";
import { publicPath } from "../runtime-paths.js";
import type {
  CollectionFormInitial,
  CollectionFormLabels,
  CollectionSubmitDetail,
} from "./collection-types.js";

export class JantCollectionForm extends LitElement {
  static properties = {
    labels: { type: Object },
    initial: { type: Object },
    action: { type: String },
    cancelHref: { type: String, attribute: "cancel-href" },
    isEdit: { type: Boolean, attribute: "is-edit" },
    variant: { type: String },

    _title: { state: true },
    _slug: { state: true },
    _description: { state: true },
    _sortOrder: { state: true },
    _showSlugEditor: { state: true },
    _slugEdited: { state: true },
    _suggestedSlug: { state: true },
    _loading: { state: true },
  };

  declare labels: CollectionFormLabels;
  declare initial: CollectionFormInitial;
  declare action: string;
  declare cancelHref: string;
  declare isEdit: boolean;
  declare variant: "full" | "quick";

  declare _title: string;
  declare _slug: string;
  declare _description: string;
  declare _sortOrder: string;
  declare _showSlugEditor: boolean;
  declare _slugEdited: boolean;
  declare _suggestedSlug: string;
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
    };
    this.action = "";
    this.cancelHref = "/";
    this.isEdit = false;
    this.variant = "full";

    this._title = "";
    this._slug = "";
    this._description = "";
    this._sortOrder = "newest";
    this._showSlugEditor = false;
    this._slugEdited = false;
    this._suggestedSlug = "";
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
    this._suggestedSlug = this.initial.slug ?? "";
    this._description = this.initial.description ?? "";
    this._sortOrder = this.initial.sortOrder ?? "newest";
    this._slugEdited = this.isEdit || Boolean(this._slug.trim());
    this._showSlugEditor = this.variant !== "quick";
  }

  async #handleTitleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this._title = target.value;

    if (this.isEdit || this._slugEdited) {
      return;
    }

    const currentTitle = target.value;
    const slug = await slugify(currentTitle);
    if (this._title === currentTitle) {
      this._suggestedSlug = slug;
      if (!this._slugEdited) {
        this._slug = slug;
      }
    }
  }

  #handleSlugInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this._slug = target.value.toLowerCase();
    this._slugEdited = true;
  }

  #getSlugValidationMessage(): string | null {
    const issue = getSlugValidationIssue(this._slug);
    if (issue === "invalid") return this.labels.slugInvalidHelp;
    if (issue === "reserved") return this.labels.slugReservedHelp;
    return null;
  }

  #showSlugEditor() {
    if (this._showSlugEditor) return;
    this._showSlugEditor = true;
    this.updateComplete.then(() => {
      const slugInput = this.querySelector<HTMLInputElement>(
        "[data-collection-slug-input]",
      );
      slugInput?.focus();
      slugInput?.select();
    });
  }

  #resetSlugToSuggested() {
    if (!this._suggestedSlug) return;
    this._slug = this._suggestedSlug;
    this._slugEdited = false;
    if (this.variant === "quick") {
      this._showSlugEditor = false;
    }
  }

  #getCollectionLinkPreview(): string {
    const slug = this._slug.trim();
    const path = publicPath(slug ? `/c/${slug}` : "/c/");
    const origin =
      globalThis.location?.origin && globalThis.location.origin !== "null"
        ? globalThis.location.origin
        : "http://localhost";
    return new URL(path, `${origin}/`).toString();
  }

  #renderSlugHelper() {
    const slugError = this.#getSlugValidationMessage();
    if (slugError) {
      return html`<p
        class="text-xs text-destructive mt-1"
        data-collection-slug-error
      >
        ${slugError}
      </p>`;
    }

    if (!this._slug.trim()) {
      return html`<p class="text-xs text-muted-foreground mt-1">
        ${this.labels.slugHelp}
      </p>`;
    }

    return html`<p class="text-xs text-muted-foreground mt-1 break-all">
      ${this.#getCollectionLinkPreview()}
    </p>`;
  }

  #renderQuickSlugControls() {
    const hasPreview = Boolean(this._slug.trim());
    const canResetToTitle =
      this._showSlugEditor &&
      Boolean(this._suggestedSlug) &&
      this._slug.trim() !== this._suggestedSlug;

    if (!hasPreview && !this._showSlugEditor) {
      return nothing;
    }

    if (this._showSlugEditor) {
      return html`
        <div class="collection-quick-link-editor">
          <div class="field">
            <div class="collection-quick-link-row">
              <label class="label mb-0">${this.labels.slugLabel}</label>
              ${canResetToTitle
                ? html`
                    <button
                      type="button"
                      class="collection-quick-link-action"
                      @click=${() => this.#resetSlugToSuggested()}
                    >
                      ${this.labels.resetSlugLabel}
                    </button>
                  `
                : nothing}
            </div>
            <input
              type="text"
              class="input"
              data-collection-slug-input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              .value=${this._slug}
              aria-invalid=${this.#getSlugValidationMessage()
                ? "true"
                : "false"}
              placeholder="my-collection"
              @input=${(event: Event) => this.#handleSlugInput(event)}
            />
            ${this.#renderSlugHelper()}
          </div>
        </div>
      `;
    }

    return html`
      <div class="collection-quick-link-box">
        <div class="collection-quick-link-row">
          <p
            class="collection-quick-link-preview text-xs text-muted-foreground"
            aria-live="polite"
          >
            ${this.#getCollectionLinkPreview()}
          </p>
          <button
            type="button"
            class="collection-quick-link-action"
            @click=${() => this.#showSlugEditor()}
          >
            ${this.labels.editSlugLabel}
          </button>
        </div>
      </div>
    `;
  }

  async #handleSubmit(e: Event) {
    e.preventDefault();
    if (this._loading) {
      return;
    }

    const title = this._title.trim();
    let slug = this._slug.trim();

    if (!title) {
      this.querySelector<HTMLInputElement>(
        "[data-collection-title-input]",
      )?.focus();
      return;
    }

    if (!slug && !this._slugEdited) {
      slug = await slugify(title);
      this._slug = slug;
      this._suggestedSlug = slug;
    }

    if (!slug || this.#getSlugValidationMessage()) {
      if (this.variant === "quick" && !this._showSlugEditor) {
        this.#showSlugEditor();
      }
      this.updateComplete.then(() => {
        this.querySelector<HTMLInputElement>(
          "[data-collection-slug-input]",
        )?.focus();
      });
      return;
    }

    const detail: CollectionSubmitDetail = {
      endpoint: this.action,
      isEdit: this.isEdit,
      data: {
        title,
        slug,
        description:
          this.variant === "quick"
            ? undefined
            : this._description.trim() || undefined,
        sortOrder:
          this.variant === "quick" ? undefined : this._sortOrder || undefined,
      },
    };

    this.dispatchEvent(
      new CustomEvent<CollectionSubmitDetail>("jant:collection-submit", {
        bubbles: true,
        detail,
      }),
    );
  }

  render() {
    const isQuick = this.variant === "quick";

    return html`
      <form
        class=${isQuick
          ? "flex flex-col gap-4"
          : "flex flex-col gap-4 max-w-lg"}
        @submit=${(event: Event) => void this.#handleSubmit(event)}
      >
        <div class="field">
          <label class="label">${this.labels.titleLabel}</label>
          <input
            type="text"
            class="input"
            data-collection-title-input
            required
            .value=${this._title}
            placeholder=${this.isEdit ? nothing : this.labels.titlePlaceholder}
            @input=${(event: Event) => void this.#handleTitleInput(event)}
          />
        </div>

        ${isQuick
          ? this.#renderQuickSlugControls()
          : html`
              <div class="field">
                <label class="label">${this.labels.slugLabel}</label>
                <input
                  type="text"
                  class="input"
                  data-collection-slug-input
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  .value=${this._slug}
                  aria-invalid=${this.#getSlugValidationMessage()
                    ? "true"
                    : "false"}
                  placeholder=${this.isEdit ? nothing : "my-collection"}
                  @input=${(event: Event) => this.#handleSlugInput(event)}
                />
                ${this.#renderSlugHelper()}
              </div>
            `}
        ${isQuick
          ? nothing
          : html`
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
                  <option value="rating_desc">
                    ${this.labels.sortRatingDesc}
                  </option>
                  <option value="rating_asc">
                    ${this.labels.sortRatingAsc}
                  </option>
                </select>
              </div>
            `}
        ${isQuick
          ? html`
              <button type="submit" class="sr-only">
                ${this.labels.quickSubmitLabel}
              </button>
            `
          : html`
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
            `}
      </form>
    `;
  }
}

customElements.define("jant-collection-form", JantCollectionForm);
