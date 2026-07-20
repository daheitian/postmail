import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";

/** Persistent page chrome that distinguishes an authenticated draft preview. */
export const DraftPreviewBar: FC = () => {
  const { i18n } = useLingui();
  const label = i18n._(
    msg({
      message: "Draft preview",
      comment: "@context: Status label above a draft preview page",
    }),
  );

  return (
    <aside class="draft-preview-bar" aria-label={label} data-preview-status>
      <div class="draft-preview-bar-inner">
        <span class="draft-preview-bar-label">
          <span class="draft-preview-bar-dot" aria-hidden="true" />
          {label}
        </span>
        <span class="draft-preview-bar-description">
          {i18n._(
            msg({
              message: "This post isn’t published.",
              comment: "@context: Explanation in the draft preview status bar",
            }),
          )}
        </span>
      </div>
    </aside>
  );
};
