import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Collection } from "../../types.js";
import { ComposeForm } from "../compose/ComposeDialog.js";

export interface ComposePageProps {
  collections?: Collection[];
  uploadMaxFileSize?: number;
  closeHref?: string;
}

export const ComposePage: FC<ComposePageProps> = ({
  collections,
  uploadMaxFileSize,
  closeHref = "/",
}) => {
  const { t } = useLingui();
  const backLabel = t({
    message: "Back",
    comment: "@context: Link back from the new post page",
  });

  return (
    <section class="compose-page" data-page="compose">
      <div class="compose-page-shell">
        <div class="compose-page-intro">
          <div class="compose-page-intro-row">
            <h1 class="compose-page-title">
              {t({
                message: "New post",
                comment: "@context: Page title for the new post page",
              })}
            </h1>
            <button
              type="button"
              class="compose-page-back-link"
              aria-label={backLabel}
              data-on:click="el.closest('.compose-page-shell')?.querySelector('jant-compose-dialog')?.requestCloseAndLeave()"
            >
              <span>{`← ${backLabel}`}</span>
            </button>
          </div>
        </div>
        <ComposeForm
          collections={collections}
          uploadMaxFileSize={uploadMaxFileSize}
          pageMode
          closeHref={closeHref}
          autoRestoreDraft
        />
      </div>
    </section>
  );
};
