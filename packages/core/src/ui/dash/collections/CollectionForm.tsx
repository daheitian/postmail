/**
 * Shared collection form (new + edit)
 */

import { useLingui } from "@lingui/react/macro";
import type { Collection } from "../../../types.js";
import {
  parseCollectionIcon,
  renderCollectionIcon,
  ICON_COLOR_PRESETS,
  DEFAULT_ICON_COLOR,
} from "../../../lib/icons.js";
import { IconPickerGrid } from "./IconPickerGrid.js";

export function CollectionForm({
  collection,
  isEdit,
}: {
  collection?: Collection;
  isEdit?: boolean;
}) {
  const { t } = useLingui();

  const parsedIcon = parseCollectionIcon(collection?.icon ?? null);

  const signals = JSON.stringify({
    title: collection?.title ?? "",
    slug: collection?.slug ?? "",
    description: collection?.description ?? "",
    sortOrder: collection?.sortOrder ?? "newest",
    icon: collection?.icon ?? "",
    iconName: parsedIcon?.name ?? "",
    iconSvg: parsedIcon?.svg ?? "",
    iconColor: parsedIcon?.color ?? DEFAULT_ICON_COLOR,
  }).replace(/</g, "\\u003c");

  const action = isEdit
    ? `/dash/collections/${collection?.id}`
    : "/dash/collections";

  const heading = isEdit
    ? t({ message: "Edit Collection", comment: "@context: Page heading" })
    : t({ message: "New Collection", comment: "@context: Page heading" });

  const submitLabel = isEdit
    ? t({
        message: "Update Collection",
        comment: "@context: Button to save collection changes",
      })
    : t({
        message: "Create Collection",
        comment: "@context: Button to save new collection",
      });

  const cancelHref = isEdit
    ? `/dash/collections/${collection?.id}`
    : "/dash/collections";

  const currentIconHtml = renderCollectionIcon(collection?.icon ?? null, {
    size: 24,
    fallback: false,
  });

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">{heading}</h1>

      <form
        data-signals={signals}
        data-on:submit__prevent={`@post('${action}')`}
        data-indicator="_loading"
        class="flex flex-col gap-4 max-w-lg"
      >
        <div class="field">
          <label class="label">
            {t({
              message: "Title",
              comment: "@context: Collection form field",
            })}
          </label>
          <input
            type="text"
            data-bind="title"
            class="input"
            required
            placeholder={
              isEdit
                ? undefined
                : t({
                    message: "My Collection",
                    comment: "@context: Collection title placeholder",
                  })
            }
            data-on:input={
              !isEdit
                ? "$slug = $title.toLowerCase().trim().replace(/[^\\w\\s-]/g, '').replace(/[\\s_-]+/g, '-').replace(/^-+|-+$/g, '')"
                : undefined
            }
          />
        </div>

        <div class="field">
          <label class="label">
            {t({ message: "Slug", comment: "@context: Collection form field" })}
          </label>
          <input
            type="text"
            data-bind="slug"
            class="input"
            required
            pattern="[a-z0-9\-]+"
            placeholder={isEdit ? undefined : "my-collection"}
          />
          {!isEdit && (
            <p class="text-xs text-muted-foreground mt-1">
              {t({
                message:
                  "URL-safe identifier (lowercase, numbers, hyphens). For CJK titles, slug will be auto-generated on the server.",
                comment: "@context: Collection path help text",
              })}
            </p>
          )}
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "Description (optional)",
              comment: "@context: Collection form field",
            })}
          </label>
          <textarea
            data-bind="description"
            class="textarea"
            rows={3}
            placeholder={
              isEdit
                ? undefined
                : t({
                    message: "What's this collection about?",
                    comment: "@context: Collection description placeholder",
                  })
            }
          >
            {collection?.description ?? ""}
          </textarea>
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "Icon (optional)",
              comment: "@context: Collection form field",
            })}
          </label>
          <div class="flex items-center gap-3">
            {/* Icon preview */}
            <div class="flex items-center justify-center w-10 h-10 rounded-md border border-border">
              <span
                id="icon-preview"
                data-show="$iconSvg"
                style={currentIconHtml ? undefined : "display:none"}
                class="w-6 h-6 flex items-center justify-center"
                data-style:color="$iconColor"
              >
                {currentIconHtml && (
                  <span dangerouslySetInnerHTML={{ __html: currentIconHtml }} />
                )}
              </span>
              <span
                data-show="!$iconSvg"
                style={currentIconHtml ? "display:none" : undefined}
                class="text-muted-foreground text-lg"
              >
                ?
              </span>
            </div>

            {/* Choose icon button */}
            <button
              type="button"
              class="btn-outline text-sm"
              data-on:click="(() => { const d = document.getElementById('icon-picker-dialog'); const s = d?.querySelector('#icon-search'); if (s) { s.value = ''; s.dispatchEvent(new Event('input')); } d?.showModal(); })()"
            >
              {t({
                message: "Choose Icon",
                comment: "@context: Button to open icon picker",
              })}
            </button>

            {/* Remove icon button */}
            <button
              type="button"
              class="btn-ghost text-sm"
              data-show="$iconSvg"
              style={parsedIcon ? undefined : "display:none"}
              data-on:click="$iconName = ''; $iconSvg = ''; $icon = ''"
            >
              {t({
                message: "Remove",
                comment: "@context: Button to remove icon",
              })}
            </button>
          </div>

          {/* Color presets */}
          <div
            class="flex items-center gap-2 mt-2"
            data-show="$iconSvg"
            style={parsedIcon ? undefined : "display:none"}
          >
            {ICON_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                class="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={`background-color: ${preset.value}; border-color: transparent`}
                title={preset.name}
                data-on:click={`$iconColor = '${preset.value}'; $icon = JSON.stringify({ name: $iconName, svg: $iconSvg, color: $iconColor })`}
              />
            ))}
          </div>

          {/* Hidden input for form submission */}
          <input type="hidden" data-bind="icon" />
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "Sort Order",
              comment: "@context: Collection form field",
            })}
          </label>
          <select data-bind="sortOrder" class="select">
            <option
              value="newest"
              selected={
                collection?.sortOrder === "newest" || !collection?.sortOrder
              }
            >
              {t({
                message: "Newest first",
                comment: "@context: Collection sort order option",
              })}
            </option>
            <option
              value="oldest"
              selected={collection?.sortOrder === "oldest"}
            >
              {t({
                message: "Oldest first",
                comment: "@context: Collection sort order option",
              })}
            </option>
            <option
              value="rating_desc"
              selected={collection?.sortOrder === "rating_desc"}
            >
              {t({
                message: "Highest rated",
                comment: "@context: Collection sort order option",
              })}
            </option>
            <option
              value="rating_asc"
              selected={collection?.sortOrder === "rating_asc"}
            >
              {t({
                message: "Lowest rated",
                comment: "@context: Collection sort order option",
              })}
            </option>
          </select>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="btn" data-attr:disabled="$_loading">
            <svg
              data-show="$_loading"
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
            {submitLabel}
          </button>
          <a href={cancelHref} class="btn-outline">
            {t({
              message: "Cancel",
              comment: "@context: Button to cancel form",
            })}
          </a>
        </div>
      </form>

      {/* Icon picker dialog */}
      <dialog
        id="icon-picker-dialog"
        class="m-auto rounded-lg border border-border bg-background text-foreground p-0 w-full max-w-md max-h-[80vh] shadow-lg backdrop:bg-black/50"
      >
        <div class="flex flex-col max-h-[80vh]">
          <div class="flex flex-col gap-3 p-4 border-b border-border">
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                {t({
                  message: "Choose Icon",
                  comment: "@context: Icon picker dialog title",
                })}
              </h2>
              <button
                type="button"
                class="btn-ghost text-sm"
                data-on:click="document.getElementById('icon-picker-dialog')?.close()"
              >
                {t({
                  message: "Close",
                  comment: "@context: Button to close icon picker",
                })}
              </button>
            </div>
            <input
              id="icon-search"
              type="search"
              class="input text-sm"
              placeholder={t({
                message: "Search icons...",
                comment: "@context: Icon picker search placeholder",
              })}
              data-on:input={`(() => {
                const q = el.value.toLowerCase();
                const grid = document.getElementById('icon-grid');
                grid.querySelectorAll('[data-icon-name]').forEach(b => {
                  b.style.display = b.dataset.iconName.includes(q) ? '' : 'none';
                });
                grid.querySelectorAll('[data-category]').forEach(c => {
                  const has = c.querySelector('[data-icon-name]:not([style*="display: none"])');
                  c.style.display = has ? '' : 'none';
                });
              })()`}
            />
          </div>
          <div class="overflow-y-auto p-4" id="icon-grid">
            <IconPickerGrid />
          </div>
        </div>
      </dialog>
    </>
  );
}
