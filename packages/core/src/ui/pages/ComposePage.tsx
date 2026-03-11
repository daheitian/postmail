import type { FC } from "hono/jsx";
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
  return (
    <section class="compose-page" data-page="compose">
      <div class="compose-page-shell">
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
