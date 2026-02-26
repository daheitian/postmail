/**
 * Status Badge Component
 *
 * Displays badges for post status, visibility, and pinned state.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Status, Visibility } from "../../types.js";

export interface StatusBadgeProps {
  status: Status;
  visibility?: Visibility;
  pinned?: boolean;
}

export const StatusBadge: FC<StatusBadgeProps> = ({
  status,
  visibility,
  pinned,
}) => {
  const { t } = useLingui();

  const statusVariants: Record<Status, string> = {
    published: "badge-secondary",
    draft: "badge-outline",
  };

  const statusLabels: Record<Status, string> = {
    published: t({
      message: "Published",
      comment: "@context: Post status badge - published",
    }),
    draft: t({
      message: "Draft",
      comment: "@context: Post status badge - draft",
    }),
  };

  return (
    <span class="flex items-center gap-1">
      <span class={statusVariants[status]}>{statusLabels[status]}</span>
      {visibility === "featured" && (
        <span class="badge-primary">
          {t({
            message: "Featured",
            comment: "@context: Post badge - featured",
          })}
        </span>
      )}
      {visibility === "unlisted" && (
        <span class="badge-outline">
          {t({
            message: "Unlisted",
            comment: "@context: Post badge - unlisted",
          })}
        </span>
      )}
      {pinned && (
        <span class="badge-outline">
          {t({
            message: "Pinned",
            comment: "@context: Post badge - pinned",
          })}
        </span>
      )}
    </span>
  );
};
