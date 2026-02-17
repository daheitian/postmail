/**
 * Link creation/editing form
 */

import { useLingui } from "@lingui/react/macro";
import type { NavItem } from "../../../types.js";

export function LinkFormContent({
  item,
  isEdit,
}: {
  item?: NavItem;
  isEdit?: boolean;
}) {
  const { t } = useLingui();
  const title = isEdit
    ? t({ message: "Edit Link", comment: "@context: Page heading" })
    : t({ message: "New Link", comment: "@context: Page heading" });

  const signals = JSON.stringify({
    label: item?.label ?? "",
    url: item?.url ?? "",
  }).replace(/</g, "\\u003c");

  const action = isEdit ? `/dash/pages/links/${item?.id}` : "/dash/pages/links";

  return (
    <>
      <h1 class="text-2xl font-semibold mb-6">{title}</h1>

      <form
        data-signals={signals}
        data-on:submit__prevent={`@post('${action}')`}
        data-indicator="_loading"
        class="flex flex-col gap-4 max-w-lg"
      >
        <div class="field">
          <label class="label">
            {t({
              message: "Label",
              comment: "@context: Navigation link form field",
            })}
          </label>
          <input
            type="text"
            data-bind="label"
            class="input"
            placeholder="Home"
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message: "Display text for the link",
              comment: "@context: Navigation label help text",
            })}
          </p>
        </div>

        <div class="field">
          <label class="label">
            {t({
              message: "URL",
              comment: "@context: Navigation link form field",
            })}
          </label>
          <input
            type="text"
            data-bind="url"
            class="input"
            placeholder="/archive or https://..."
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            {t({
              message:
                "Path (e.g. /archive) or full URL (e.g. https://example.com)",
              comment: "@context: Navigation URL help text",
            })}
          </p>
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
            {isEdit
              ? t({
                  message: "Save Changes",
                  comment: "@context: Button to save edited navigation link",
                })
              : t({
                  message: "Create Link",
                  comment: "@context: Button to save new navigation link",
                })}
          </button>
          <a href="/dash/pages" class="btn-outline">
            {t({
              message: "Cancel",
              comment: "@context: Button to cancel form",
            })}
          </a>
        </div>
      </form>
    </>
  );
}
