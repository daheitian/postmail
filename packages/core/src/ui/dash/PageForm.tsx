/**
 * Page Creation/Edit Form
 *
 * For managing standalone pages (about, now, etc.)
 */

import type { FC } from "hono/jsx";
import type { Page } from "../../types.js";
import { useLingui } from "@lingui/react/macro";

export interface PageFormProps {
  page?: Page;
  action: string;
  cancelUrl?: string;
}

export const PageForm: FC<PageFormProps> = ({
  page,
  action,
  cancelUrl = "/dash/pages",
}) => {
  const { t } = useLingui();
  const isEdit = !!page;

  const signals = JSON.stringify({
    title: page?.title ?? "",
    slug: page?.slug ?? "",
    body: page?.body ?? "",
    status: page?.status ?? "published",
  }).replace(/</g, "\\u003c");

  return (
    <form
      data-page-form
      {...(isEdit ? { "data-page-edit": "" } : {})}
      data-signals={signals}
      data-on:submit__prevent={`@post('${action}')`}
      data-indicator="_loading"
      class="flex flex-col gap-4"
    >
      <div id="page-form-message"></div>

      {/* Title */}
      <div class="field">
        <label class="label">
          {t({
            message: "Title",
            comment: "@context: Page form field label - title",
          })}
        </label>
        <input
          type="text"
          data-bind="title"
          class="input"
          placeholder={t({
            message: "Page title...",
            comment: "@context: Page title placeholder",
          })}
          required
        />
      </div>

      {/* Slug */}
      <div class="field">
        <label class="label">
          {t({
            message: "Slug",
            comment: "@context: Page form field label - URL slug",
          })}
        </label>
        <div class="flex items-center gap-2">
          <span class="text-muted-foreground">/</span>
          <input
            type="text"
            data-bind="slug"
            class="input flex-1"
            placeholder="about"
            pattern="[a-z0-9\-]+"
            title={t({
              message: "Lowercase letters, numbers, and hyphens only",
              comment: "@context: Page slug validation message",
            })}
            required
          />
        </div>
        <p class="text-xs text-muted-foreground mt-1">
          {t({
            message:
              "The URL path for this page. Use lowercase letters, numbers, and hyphens.",
            comment: "@context: Page slug helper text",
          })}
        </p>
      </div>

      {/* Body */}
      <div class="field">
        <label class="label">
          {t({
            message: "Content",
            comment: "@context: Page form field label - content",
          })}
        </label>
        <textarea
          data-bind="body"
          class="textarea min-h-48"
          placeholder={t({
            message: "Page content (Markdown supported)...",
            comment: "@context: Page content placeholder",
          })}
          required
        >
          {page?.body ?? ""}
        </textarea>
      </div>

      {/* Status */}
      <div class="field">
        <label class="label">
          {t({
            message: "Status",
            comment: "@context: Page form field label - publish status",
          })}
        </label>
        <select data-bind="status" class="select">
          <option
            value="published"
            selected={page?.status === "published" || !page}
          >
            {t({
              message: "Published",
              comment: "@context: Page status option - published",
            })}
          </option>
          <option value="draft" selected={page?.status === "draft"}>
            {t({
              message: "Draft",
              comment: "@context: Page status option - draft",
            })}
          </option>
        </select>
        <p class="text-xs text-muted-foreground mt-1">
          {t({
            message:
              "Published pages are accessible via their slug. Drafts are not visible.",
            comment: "@context: Page status helper text",
          })}
        </p>
      </div>

      {/* Submit */}
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
          {isEdit
            ? t({
                message: "Update Page",
                comment: "@context: Button to update existing page",
              })
            : t({
                message: "Create Page",
                comment: "@context: Button to create new page",
              })}
        </button>
        <a href={cancelUrl} class="btn-outline">
          {t({
            message: "Cancel",
            comment: "@context: Button to cancel and go back",
          })}
        </a>
      </div>
    </form>
  );
};
