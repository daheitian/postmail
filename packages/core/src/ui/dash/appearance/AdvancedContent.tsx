/**
 * Advanced appearance: custom CSS editor
 */

import { useLingui } from "@lingui/react/macro";

const THEMING_DOCS_URL =
  "https://github.com/jant-me/jant/blob/main/docs/theming.md";

export function AdvancedContent({ customCSS }: { customCSS: string }) {
  const { t } = useLingui();

  const cssSignals = JSON.stringify({ customCSS }).replace(/</g, "\\u003c");

  return (
    <form
      data-signals={cssSignals}
      data-on:submit__prevent="@post('/settings/custom-css')"
      data-indicator="_cssLoading"
      class="max-w-3xl"
    >
      <fieldset>
        <legend class="text-lg font-semibold">
          {t({
            message: "Custom CSS",
            comment: "@context: Appearance settings heading for custom CSS",
          })}
        </legend>
        <p class="text-sm text-muted-foreground mb-4">
          {t({
            message:
              "Add custom CSS to override any styles. Use data attributes like [data-page], [data-post], [data-format] to target specific elements.",
            comment: "@context: Custom CSS settings description",
          })}{" "}
          <a
            href={THEMING_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-foreground transition-colors"
          >
            {t({
              message: "Theming guide",
              comment:
                "@context: Link to theming documentation on Custom CSS page",
            })}
          </a>
          {" — "}
          {t({
            message: "available CSS variables, data attributes, and examples.",
            comment:
              "@context: Description after theming guide link on Custom CSS page",
          })}
        </p>
        <textarea
          data-bind="customCSS"
          class="textarea font-mono text-sm min-h-32"
          rows={8}
          placeholder={t({
            message: "/* Your custom CSS here */",
            comment: "@context: Custom CSS textarea placeholder",
          })}
        >
          {customCSS}
        </textarea>
      </fieldset>
      <button type="submit" class="btn mt-4" data-attr:disabled="$_cssLoading">
        <svg
          data-show="$_cssLoading"
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
          message: "Save CSS",
          comment: "@context: Button to save custom CSS",
        })}
      </button>
    </form>
  );
}
