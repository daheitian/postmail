/**
 * Advanced appearance: custom CSS editor
 */

import { useLingui } from "@lingui/react/macro";
import { AppearanceNav } from "./AppearanceNav.js";

export function AdvancedContent({ customCSS }: { customCSS: string }) {
  const { t } = useLingui();

  const cssSignals = JSON.stringify({ customCSS }).replace(/</g, "\\u003c");

  return (
    <>
      <h1 class="text-2xl font-semibold mb-2">
        {t({ message: "Appearance", comment: "@context: Dashboard heading" })}
      </h1>
      <AppearanceNav currentTab="advanced" />

      <form
        data-signals={cssSignals}
        data-on:submit__prevent="@post('/dash/appearance/custom-css')"
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
        <button
          type="submit"
          class="btn mt-4"
          data-attr:disabled="$_cssLoading"
        >
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
    </>
  );
}
