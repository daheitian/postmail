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
    quoteAuthor: "",
    status: "published",
    rating: 0,
    collectionIds: [],
    mediaIds: [],
    attachedText: "",
    _composeLoading: false,
    _showTitle: false,
    _showRating: false,
    _showCollection: false,
    _showAttachedText: false,
    _showMoreMenu: false,
  }).replace(/</g, "\\u003c");

  return (
    <dialog
      id="compose-dialog"
      class="compose-dialog"
      onclick="event.target === this && this.close()"
    >
      <div class="compose-dialog-inner" data-signals={signals}>
        {/* ── Attached Text overlay panel ──────────────────────── */}
        <div
          data-show="$_showAttachedText"
          style="display:none"
          class="compose-attached-panel"
        >
          <div class="flex items-center gap-2.5 px-3 py-2.5 border-b border-border">
            <button
              type="button"
              class="compose-attached-panel-back"
              data-on:click="$_showAttachedText = false"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M11 3L6 8l5 5" />
              </svg>
            </button>
            <span class="text-sm font-medium tracking-tight">
              {t({
                message: "Attached Text",
                comment: "@context: Attached text panel title",
              })}
            </span>
            <div class="flex-1" />
            <span
              data-show="$attachedText.length > 0"
              style="display:none"
              data-text="$attachedText.length.toLocaleString() + ' chars'"
              class="text-xs text-muted-foreground tracking-wide"
            />
          </div>

          <div class="flex-1 p-4 overflow-hidden flex flex-col">
            <textarea
              data-bind="attachedText"
              class="compose-input compose-attached-textarea"
              placeholder={t({
                message:
                  "Paste a long article, AI response, or any text...\n\nMarkdown formatting will be preserved.",
                comment: "@context: Attached text placeholder",
              })}
              autofocus
            />
          </div>

          <div class="flex items-center justify-between px-3 py-2 border-t border-border">
            <span class="text-xs text-muted-foreground">
              {t({
                message: "Supplementary content attached to your post",
                comment: "@context: Attached text panel hint",
              })}
            </span>
            <button
              type="button"
              class="compose-post-btn"
              data-on:click="$_showAttachedText = false"
            >
              {t({
                message: "Done",
                comment: "@context: Close attached text panel",
              })}
            </button>
          </div>
        </div>

        {/* ── Header: Cancel │ Format Switcher │ Draft · More ── */}
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

          <div class="compose-dialog-header-center">
            <div class="compose-segmented">
              <div
                class="compose-format-pill"
                data-class:compose-format-pill-link="$format === 'link'"
                data-class:compose-format-pill-quote="$format === 'quote'"
              />
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
          </div>

          <div class="flex items-center gap-0.5 shrink-0">
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
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M14 2.5L15.5 4 7 12.5l-3 .5.5-3L14 2.5z" />
                <path d="M4 15h10" />
              </svg>
            </button>

            {/* More menu */}
            <div class="relative">
              <div
                data-show="$_showMoreMenu"
                style="display:none"
                data-on:click="$_showMoreMenu = false"
                class="compose-dropdown-backdrop"
              />
              <button
                type="button"
                class="compose-dialog-header-btn"
                data-on:click="$_showMoreMenu = !$_showMoreMenu"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="currentColor"
                >
                  <circle cx="4.5" cy="9" r="1.3" />
                  <circle cx="9" cy="9" r="1.3" />
                  <circle cx="13.5" cy="9" r="1.3" />
                </svg>
              </button>
              <div
                data-show="$_showMoreMenu"
                style="display:none"
                class="compose-dropdown compose-dropdown-right"
              >
                <button
                  type="button"
                  class="compose-dropdown-item"
                  data-on:click="$status = 'draft'; document.querySelector('#compose-dialog form').requestSubmit(); $_showMoreMenu = false"
                >
                  {t({
                    message: "Save as draft",
                    comment: "@context: More menu - save draft",
                  })}
                </button>
                <div class="compose-dropdown-divider" />
                <button
                  type="button"
                  class="compose-dropdown-item compose-dropdown-item-danger"
                  data-on:click="document.getElementById('compose-dialog').close(); $_showMoreMenu = false"
                >
                  {t({
                    message: "Discard",
                    comment: "@context: More menu - discard post",
                  })}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── Body ──────────────────────────────────────────────── */}
        <form
          data-on:submit__prevent="@post('/compose')"
          data-indicator="_composeLoading"
        >
          <section class="compose-body">
            {/* ── Note mode ── */}
            <div data-show="$format === 'note'" class="compose-field-enter">
              <div
                data-show="$_showTitle"
                style="display:none"
                class="compose-note-title-row"
              >
                <input
                  type="text"
                  data-bind="title"
                  class="compose-input compose-note-title"
                  placeholder={t({
                    message: "Title",
                    comment: "@context: Compose note title placeholder",
                  })}
                />
                <button
                  type="button"
                  class="compose-note-title-dismiss"
                  data-on:click="$_showTitle = false"
                >
                  ✕
                </button>
              </div>
              <textarea
                data-bind="body"
                class="compose-input compose-body-input"
                autofocus
                placeholder={t({
                  message: "What's on your mind...",
                  comment: "@context: Compose body placeholder",
                })}
                rows={4}
              />
            </div>

            {/* ── Link mode ── */}
            <div
              data-show="$format === 'link'"
              style="display:none"
              class="compose-field-enter"
            >
              <div class="compose-link-url-wrap">
                <span class="text-base opacity-50 shrink-0">🔗</span>
                <input
                  type="url"
                  data-bind="url"
                  class="compose-input"
                  placeholder={t({
                    message: "Paste a URL...",
                    comment: "@context: Compose link URL placeholder",
                  })}
                  style="font-size:0.9rem"
                />
              </div>
              <input
                type="text"
                data-bind="title"
                class="compose-input compose-link-title"
                placeholder={t({
                  message: "Give it a title...",
                  comment: "@context: Compose link title placeholder",
                })}
              />
              <div class="compose-divider" />
              <textarea
                data-bind="body"
                class="compose-input compose-thoughts"
                placeholder={t({
                  message: "Your thoughts (optional)",
                  comment: "@context: Compose thoughts placeholder",
                })}
                rows={3}
              />
            </div>

            {/* ── Quote mode ── */}
            <div
              data-show="$format === 'quote'"
              style="display:none"
              class="compose-field-enter"
            >
              <div class="compose-quote-wrap">
                <span class="compose-quote-mark">{"\u201C"}</span>
                <textarea
                  data-bind="quoteText"
                  class="compose-input compose-quote-text"
                  placeholder={t({
                    message: "Type the quote...",
                    comment: "@context: Compose quote text placeholder",
                  })}
                  rows={3}
                />
              </div>
              <div class="compose-quote-author-row">
                <span class="compose-quote-dash">{"\u2014"}</span>
                <input
                  type="text"
                  data-bind="quoteAuthor"
                  class="compose-input compose-quote-author"
                  placeholder={t({
                    message: "Author (optional)",
                    comment: "@context: Compose quote author placeholder",
                  })}
                />
              </div>
              <div class="compose-quote-source">
                <input
                  type="url"
                  data-bind="url"
                  class="compose-input"
                  placeholder={t({
                    message: "Source link (optional)",
                    comment: "@context: Compose quote source link placeholder",
                  })}
                  style="font-size:0.78rem"
                />
              </div>
              <div class="compose-divider" />
              <textarea
                data-bind="body"
                class="compose-input compose-thoughts"
                placeholder={t({
                  message: "Your thoughts (optional)",
                  comment: "@context: Compose thoughts placeholder",
                })}
                rows={2}
              />
            </div>

            {/* ── Star rating (inline, toggleable) ── */}
            <div
              data-show="$_showRating"
              style="display:none"
              class="compose-star-rating"
            >
              <button
                type="button"
                class="compose-star"
                data-class:compose-star-filled="$rating >= 1"
                data-on:click="$rating === 1 ? $rating = 0 : $rating = 1"
              >
                ★
              </button>
              <button
                type="button"
                class="compose-star"
                data-class:compose-star-filled="$rating >= 2"
                data-on:click="$rating === 2 ? $rating = 0 : $rating = 2"
              >
                ★
              </button>
              <button
                type="button"
                class="compose-star"
                data-class:compose-star-filled="$rating >= 3"
                data-on:click="$rating === 3 ? $rating = 0 : $rating = 3"
              >
                ★
              </button>
              <button
                type="button"
                class="compose-star"
                data-class:compose-star-filled="$rating >= 4"
                data-on:click="$rating === 4 ? $rating = 0 : $rating = 4"
              >
                ★
              </button>
              <button
                type="button"
                class="compose-star"
                data-class:compose-star-filled="$rating >= 5"
                data-on:click="$rating === 5 ? $rating = 0 : $rating = 5"
              >
                ★
              </button>
              <span
                data-show="$rating > 0"
                style="display:none"
                data-text="$rating + '/5'"
                class="compose-star-label"
              />
            </div>

            {/* ── Attached text badge (collapsed) ── */}
            <div
              data-show="$attachedText.trim().length > 0 && !$_showAttachedText"
              style="display:none"
              class="compose-attached-badge"
              data-on:click="$_showAttachedText = true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
                class="text-muted-foreground"
              >
                <rect x="3" y="2" width="12" height="14" rx="2" />
                <line x1="6" y1="6" x2="12" y2="6" />
                <line x1="6" y1="9" x2="12" y2="9" />
                <line x1="6" y1="12" x2="9.5" y2="12" />
              </svg>
              <span class="text-xs font-medium">
                {t({
                  message: "Attached text",
                  comment: "@context: Attached text badge label",
                })}
              </span>
              <span
                data-text="'\u00B7 ' + $attachedText.length.toLocaleString() + ' chars'"
                class="text-xs text-muted-foreground"
              />
              <div class="flex-1" />
              <button
                type="button"
                class="compose-attached-badge-dismiss"
                data-on:click__stop="$attachedText = ''"
              >
                ✕
              </button>
            </div>
          </section>

          {/* ── Tools row ─────────────────────────────────────── */}
          <div class="compose-tools-row">
            {/* Media */}
            <button
              type="button"
              class="compose-tool-btn"
              data-class:compose-tool-btn-active="$mediaIds.length > 0"
              data-on:click="document.getElementById('compose-media-picker').showModal(); fetch('/dash/media/picker').then(r => r.text()).then(html => document.getElementById('compose-media-grid').innerHTML = html)"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="2" y="3" width="14" height="12" rx="2.5" />
                <circle cx="6.5" cy="7.5" r="1.5" />
                <path d="M2 13l4-4c.6-.6 1.4-.6 2 0l4 4" />
                <path d="M11 11l1.5-1.5c.6-.6 1.4-.6 2 0L16 11" />
              </svg>
              <span class="compose-tool-tip">
                {t({
                  message: "Media",
                  comment: "@context: Compose toolbar - media tooltip",
                })}
              </span>
            </button>

            {/* Attached Text */}
            <button
              type="button"
              class="compose-tool-btn"
              data-class:compose-tool-btn-active="$attachedText.trim().length > 0"
              data-on:click="$_showAttachedText = true"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.3"
                stroke-linecap="round"
              >
                <rect x="3" y="2" width="12" height="14" rx="2" />
                <line x1="6" y1="6" x2="12" y2="6" />
                <line x1="6" y1="9" x2="12" y2="9" />
                <line x1="6" y1="12" x2="9.5" y2="12" />
              </svg>
              <span class="compose-tool-tip">
                {t({
                  message: "Attached Text",
                  comment: "@context: Compose toolbar - attached text tooltip",
                })}
              </span>
            </button>

            {/* Score */}
            <button
              type="button"
              class="compose-tool-btn"
              data-class:compose-tool-btn-active="$_showRating"
              data-on:click="$_showRating = !$_showRating"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="12" width="2.8" height="3" rx="0.7" />
                <rect x="7.6" y="8.5" width="2.8" height="6.5" rx="0.7" />
                <rect x="12.2" y="5" width="2.8" height="10" rx="0.7" />
              </svg>
              <span class="compose-tool-tip">
                {t({
                  message: "Score",
                  comment: "@context: Compose toolbar - score tooltip",
                })}
              </span>
            </button>

            {/* Title toggle (Note only) */}
            <div
              data-show="$format === 'note'"
              class="flex items-center gap-0.5"
            >
              <div class="compose-tool-sep" />
              <button
                type="button"
                class="compose-tool-btn"
                data-class:compose-tool-btn-active="$_showTitle"
                data-on:click="$_showTitle = !$_showTitle"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <text
                    x="3.5"
                    y="14"
                    font-family="serif"
                    font-size="14"
                    font-weight="400"
                    fill="currentColor"
                  >
                    T
                  </text>
                </svg>
                <span class="compose-tool-tip">
                  {t({
                    message: "Title",
                    comment: "@context: Compose toolbar - title tooltip",
                  })}
                </span>
              </button>
            </div>

            <div class="flex-1" />
          </div>

          {/* ── Action row: Collection + Post ─────────────────── */}
          <div class="compose-action-row">
            {collections && collections.length > 0 ? (
              <div class="relative flex-1 min-w-0">
                <div
                  data-show="$_showCollection"
                  style="display:none"
                  data-on:click="$_showCollection = false"
                  class="compose-dropdown-backdrop"
                />
                <button
                  type="button"
                  class="compose-collection-trigger"
                  data-class:compose-collection-trigger-active="$collectionIds.length > 0"
                  data-on:click="$_showCollection = !$_showCollection"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 18 18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="shrink-0"
                  >
                    <rect x="3" y="5" width="12" height="10" rx="2" />
                    <path d="M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
                  </svg>
                  <span class="compose-collection-label">
                    {t({
                      message: "Collection",
                      comment:
                        "@context: Compose collection selector placeholder",
                    })}
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="shrink-0 -ml-0.5"
                  >
                    <path d="M3 4l2 2 2-2" />
                  </svg>
                </button>

                <div
                  data-show="$_showCollection"
                  style="display:none"
                  class="compose-dropdown compose-dropdown-above"
                >
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      class="compose-dropdown-item"
                      data-class:compose-dropdown-item-active={`$collectionIds.includes(${col.id})`}
                      data-on:click={`$collectionIds.includes(${col.id}) ? $collectionIds = $collectionIds.filter(id => id !== ${col.id}) : $collectionIds = [...$collectionIds, ${col.id}]`}
                    >
                      <input
                        type="checkbox"
                        class="checkbox"
                        style="pointer-events:none"
                        data-attr:checked={`$collectionIds.includes(${col.id})`}
                      />
                      {col.icon ? `${col.icon} ${col.title}` : col.title}
                      <span
                        data-show={`$collectionIds.includes(${col.id})`}
                        style="display:none"
                        class="compose-dropdown-check"
                      >
                        ✓
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div class="flex-1" />
            )}

            <button
              type="submit"
              class="compose-post-btn"
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

        {/* ── Nested media picker dialog ──────────────────────── */}
        <dialog
          id="compose-media-picker"
          class="compose-media-picker"
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
      </div>
    </dialog>
  );
};
