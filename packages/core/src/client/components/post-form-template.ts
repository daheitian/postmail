import { html, nothing } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import type { JantPostForm } from "./jant-post-form.js";

function renderMediaList(component: JantPostForm) {
  const { media, labels, _mediaIds } = component;
  if (_mediaIds.length === 0) {
    return html`<p class="text-sm text-muted-foreground">
      ${labels.mediaEmptyLabel}
    </p>`;
  }

  const mediaMap = new Map(media.map((item) => [item.id, item]));

  return html`<div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-2">
    ${_mediaIds.map((id) => {
      const item = mediaMap.get(id);
      if (!item) {
        return html`<div
          class="relative group aspect-square rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground"
        >
          ${id}
          <button
            type="button"
            class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            @click=${() => component.removeMedia(id)}
            aria-label=${labels.mediaRemoveButton}
          >
            &times;
          </button>
        </div>`;
      }

      return html`<div class="relative group aspect-square" data-media-id=${id}>
        <img
          src=${item.thumbUrl}
          alt=${item.alt}
          class="w-full h-full object-cover rounded-lg border"
          loading="lazy"
        />
        <button
          type="button"
          class="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          @click=${() => component.removeMedia(id)}
          aria-label=${labels.mediaRemoveButton}
        >
          &times;
        </button>
      </div>`;
    })}
  </div>`;
}

function renderCollections(component: JantPostForm) {
  if (!component.collections.length) return nothing;

  return html`<div class="field">
    <label class="label">${component.labels.collectionsLabel}</label>
    <div class="flex flex-col gap-1">
      ${component.collections.map((col) => {
        const iconNode = col.iconHtml
          ? html`<span class="inline-flex items-center justify-center w-5 h-5">
              ${unsafeHTML(col.iconHtml)}
            </span>`
          : nothing;
        return html`<label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            class="checkbox"
            .checked=${component._collectionIds.includes(col.id)}
            @change=${() => component.toggleCollection(col.id)}
          />
          ${iconNode}
          <span>${col.title}</span>
        </label>`;
      })}
    </div>
  </div>`;
}

export function renderPostForm(component: JantPostForm) {
  return html`<form
      class="flex flex-col gap-4 max-w-2xl"
      @submit=${(e: Event) => component.handleSubmit(e)}
    >
      <div class="field">
        <label class="label">${component.labels.formatLabel}</label>
        <select
          class="select"
          .value=${component._format}
          @change=${(e: Event) => {
            const target = e.target as HTMLSelectElement;
            component._format =
              (target.value as typeof component._format) ?? "note";
          }}
        >
          <option value="note">${component.labels.noteOption}</option>
          <option value="link">${component.labels.linkOption}</option>
          <option value="quote">${component.labels.quoteOption}</option>
        </select>
      </div>

      <div class="field">
        <label class="label">${component.labels.titleLabel}</label>
        <input
          type="text"
          class="input"
          placeholder=${component.labels.titlePlaceholder}
          .value=${component._title}
          @input=${(e: Event) => component.handleTitleInput(e)}
        />
      </div>

      <div class="field">
        <label class="label">${component.labels.slugLabel}</label>
        <input
          type="text"
          class="input"
          placeholder=${component.labels.slugPlaceholder}
          .value=${component._slug}
          @input=${(e: Event) => component.handleSlugInput(e)}
        />
        ${component._slug
          ? html`<p class="text-xs text-muted-foreground mt-1">
              ${component.siteUrl}/${component._slug}
            </p>`
          : html`<p class="text-xs text-muted-foreground mt-1">
              ${component.labels.slugHelp}
            </p>`}
      </div>

      <div class="field">
        <label class="label">${component.labels.bodyLabel}</label>
        <div
          class="post-form-tiptap-body compose-tiptap-body border rounded-lg p-3 min-h-32"
        ></div>
      </div>

      <div class="field">
        <label class="label">${component.labels.urlLabel}</label>
        <input
          type="url"
          class="input"
          placeholder=${component.labels.urlPlaceholder}
          .value=${component._url}
          @input=${(e: Event) => component.handleInput("_url", e)}
        />
      </div>

      ${component._format === "quote"
        ? html`<div class="field">
            <label class="label">${component.labels.quoteTextLabel}</label>
            <textarea
              class="textarea"
              rows="3"
              placeholder=${component.labels.quoteTextPlaceholder}
              .value=${component._quoteText}
              @input=${(e: Event) => component.handleInput("_quoteText", e)}
            ></textarea>
          </div>`
        : nothing}

      <div class="field">
        <label class="label">${component.labels.mediaLabel}</label>
        ${renderMediaList(component)}
        <button
          type="button"
          class="btn-outline text-sm"
          @click=${() => component.openMediaPicker()}
        >
          ${component.labels.mediaAddButton}
        </button>
      </div>

      <div class="field">
        <label class="label">${component.labels.statusLabel}</label>
        <select
          class="select"
          .value=${component._status}
          @change=${(e: Event) => {
            const target = e.target as HTMLSelectElement;
            component._status =
              (target.value as typeof component._status) ?? "published";
          }}
        >
          <option value="published">${component.labels.statusPublished}</option>
          <option value="draft">${component.labels.statusDraft}</option>
        </select>
      </div>

      <div class="field">
        <label class="label">${component.labels.visibilityLabel}</label>
        <select
          class="select"
          .value=${component._visibility}
          @change=${(e: Event) => {
            const target = e.target as HTMLSelectElement;
            component._visibility =
              (target.value as typeof component._visibility) ?? "public";
          }}
        >
          <option value="public">${component.labels.visibilityPublic}</option>
          <option value="featured">
            ${component.labels.visibilityFeatured}
          </option>
          <option value="unlisted">
            ${component.labels.visibilityUnlisted}
          </option>
        </select>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="checkbox"
          .checked=${component._pinned}
          @change=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            component._pinned = target.checked;
          }}
        />
        ${component.labels.pinnedLabel}
      </label>

      ${renderCollections(component)}

      <div class="flex gap-2">
        <button type="submit" class="btn" ?disabled=${component._loading}>
          ${component._loading
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
          ${component.labels.submitLabel}
        </button>
        <a href=${component.cancelHref} class="btn-outline"
          >${component.labels.cancelLabel}</a
        >
      </div>
    </form>

    <dialog
      id="post-media-picker"
      class="p-6 rounded-lg max-w-2xl w-full backdrop:bg-black/50"
      @click=${(event: Event) => {
        if (event.target === event.currentTarget) {
          component.closeMediaPicker();
        }
      }}
    >
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          ${component.labels.mediaDialogTitle}
        </h2>
        <button
          type="button"
          class="btn-outline text-sm"
          @click=${() => component.closeMediaPicker()}
        >
          ${component.labels.mediaDialogDone}
        </button>
      </div>
      <div
        id="post-media-grid"
        class="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto"
      >
        <p class="text-muted-foreground text-sm col-span-4">
          ${component.labels.mediaDialogLoading}
        </p>
      </div>
    </dialog>`;
}
