/**
 * Compose Dialog
 *
 * Full-screen compose dialog for quick post creation.
 * Rendered server-side as part of SiteLayout for authenticated users.
 */

import type { FC } from "hono/jsx";
import type { Collection } from "../../types.js";
import { useLingui } from "@lingui/react/macro";

export interface ComposeDialogProps {
  collections?: Collection[];
}

export const ComposeDialog: FC<ComposeDialogProps> = ({ collections }) => {
  const { t } = useLingui();

  const signals = JSON.stringify({
    format: "note",
    title: "",
    body: "",
    url: "",
    quoteText: "",
    status: "published",
    rating: 0,
    collectionIds: [],
    mediaIds: [],
    _composeLoading: false,
    _showRating: false,
    _showCollection: false,
  }).replace(/</g, "\\u003c");

  return (
    <dialog
      id="compose-dialog"
      class="compose-dialog backdrop:bg-black/50"
      onclick="event.target === this && this.close()"
    >
      <div class="compose-dialog-inner" data-signals={signals}>
        {/* Header */}
        <header class="compose-dialog-header">
          <button
            type="button"
            class="compose-dialog-cancel"
            onclick="this.closest('dialog').close()"
          >
            {t({
              message: "Cancel",
              comment: "@context: Close compose dialog",
            })}
          </button>
          <div class="compose-segmented">
            <button
              type="button"
              class="compose-segmented-item"
              data-class:compose-segmented-item-active="$format === 'note'"
              data-on:click="$format = 'note'"
            >
              {t({
                message: "Note",
                comment: "@context: Compose format tab",
              })}
            </button>
            <button
              type="button"
              class="compose-segmented-item"
              data-class:compose-segmented-item-active="$format === 'link'"
              data-on:click="$format = 'link'"
            >
              {t({
                message: "Link",
                comment: "@context: Compose format tab",
              })}
            </button>
            <button
              type="button"
              class="compose-segmented-item"
              data-class:compose-segmented-item-active="$format === 'quote'"
              data-on:click="$format = 'quote'"
            >
              {t({
                message: "Quote",
                comment: "@context: Compose format tab",
              })}
            </button>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="compose-dialog-header-btn"
              title={t({
                message: "Save as Draft",
                comment: "@context: Header draft button tooltip",
              })}
              data-attr:disabled="$_composeLoading"
              data-on:click="$status = 'draft'; document.querySelector('#compose-dialog form').requestSubmit()"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
              </svg>
            </button>
            <button
              type="button"
              class="compose-dialog-header-btn"
              title={t({
                message: "More options",
                comment: "@context: Header more button tooltip",
              })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Form */}
        <section class="compose-dialog-body">
          <form
            data-on:submit__prevent="@post('/compose')"
            data-indicator="_composeLoading"
            class="flex flex-col gap-3"
          >
            {/* Title input */}
            <input
              type="text"
              data-bind="title"
              class="compose-title-input"
              placeholder={t({
                message: "Title (optional)",
                comment: "@context: Compose title placeholder",
              })}
            />

            {/* Body textarea */}
            <textarea
              data-bind="body"
              class="compose-body-input"
              autofocus
              placeholder={t({
                message: "What's on your mind?",
                comment: "@context: Compose body placeholder",
              })}
              rows={4}
            />

            {/* URL input (link/quote) */}
            <div data-show="$format === 'link' || $format === 'quote'">
              <input
                type="url"
                data-bind="url"
                class="input text-sm"
                placeholder="https://..."
              />
            </div>

            {/* Quote text (quote format) */}
            <div data-show="$format === 'quote'">
              <textarea
                data-bind="quoteText"
                class="textarea text-sm"
                placeholder={t({
                  message: "The text being quoted...",
                  comment: "@context: Compose quote text placeholder",
                })}
                rows={2}
              />
            </div>

            {/* Rating picker (toggleable) */}
            <div data-show="$_showRating" class="field">
              <label class="label text-sm">
                {t({
                  message: "Rating",
                  comment: "@context: Compose rating field",
                })}
              </label>
              <select data-bind="rating" class="select text-sm">
                <option value="0">
                  {t({
                    message: "None",
                    comment: "@context: No rating selected",
                  })}
                </option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            {/* Collection picker (toggleable) */}
            {collections && collections.length > 0 && (
              <div data-show="$_showCollection" class="field">
                <label class="label text-sm">
                  {t({
                    message: "Collections",
                    comment: "@context: Compose collection field",
                  })}
                </label>
                <div class="flex flex-col gap-1">
                  {collections.map((col) => (
                    <label key={col.id} class="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        class="checkbox"
                        data-on:change={`$collectionIds.includes(${col.id}) ? $collectionIds = $collectionIds.filter(id => id !== ${col.id}) : $collectionIds = [...$collectionIds, ${col.id}]`}
                        data-attr:checked={`$collectionIds.includes(${col.id})`}
                      />
                      {col.icon ? `${col.icon} ${col.title}` : col.title}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Footer: toolbar + submit */}
            <div class="compose-dialog-footer">
              <div class="flex gap-1">
                {/* Media button */}
                <button
                  type="button"
                  class="compose-toolbar-btn"
                  title={t({
                    message: "Add Media",
                    comment: "@context: Compose toolbar - add media",
                  })}
                  data-on:click="document.getElementById('compose-media-picker').showModal(); fetch('/dash/media/picker').then(r => r.text()).then(html => document.getElementById('compose-media-grid').innerHTML = html)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </button>

                {/* Rating toggle */}
                <button
                  type="button"
                  class="compose-toolbar-btn"
                  title={t({
                    message: "Rating",
                    comment: "@context: Compose toolbar - toggle rating",
                  })}
                  data-on:click="$_showRating = !$_showRating"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>

                {/* Collection toggle */}
                {collections && collections.length > 0 && (
                  <button
                    type="button"
                    class="compose-toolbar-btn"
                    title={t({
                      message: "Collection",
                      comment: "@context: Compose toolbar - toggle collection",
                    })}
                    data-on:click="$_showCollection = !$_showCollection"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="submit"
                class="btn text-sm"
                data-attr:disabled="$_composeLoading"
              >
                <svg
                  data-show="$_composeLoading"
                  style="display:none"
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
                </svg>
                {t({
                  message: "Post",
                  comment: "@context: Compose button - publish post",
                })}
              </button>
            </div>
          </form>
        </section>
      </div>

      {/* Nested media picker dialog */}
      <dialog
        id="compose-media-picker"
        class="p-6 rounded-lg max-w-2xl w-full backdrop:bg-black/50"
        onclick="event.target === this && this.close()"
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">
            {t({
              message: "Select Media",
              comment: "@context: Media picker dialog title",
            })}
          </h2>
          <button
            type="button"
            class="btn-outline text-sm"
            onclick="this.closest('dialog').close()"
          >
            {t({
              message: "Done",
              comment: "@context: Close media picker button",
            })}
          </button>
        </div>
        <div
          id="compose-media-grid"
          class="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto"
        >
          <p class="text-muted-foreground text-sm col-span-4">
            {t({
              message: "Loading...",
              comment: "@context: Loading state for media picker",
            })}
          </p>
        </div>
      </dialog>
    </dialog>
  );
};
