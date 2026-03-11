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

  return (
    <section class="compose-page" data-page="compose">
      <div class="compose-page-shell">
        <div class="compose-page-intro">
          <h1 class="compose-page-title">
            {t({
              message: "New post",
              comment: "@context: Page title for the new post page",
            })}
          </h1>
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
