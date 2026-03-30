/**
 * Format Badge Component
 *
 * Displays a badge indicating the format of a post (note, link, quote).
 */

import { msg } from "@lingui/core/macro";
import type { FC } from "hono/jsx";
import { useLingui } from "../../i18n/context.js";
import type { Format } from "../../types.js";

export interface FormatBadgeProps {
  type: Format;
}

export const FormatBadge: FC<FormatBadgeProps> = ({ type }) => {
  const { i18n } = useLingui();

  const labels: Record<Format, string> = {
    note: i18n._(
      msg({
        message: "Note",
        comment: "@context: Post format badge - note",
      }),
    ),
    link: i18n._(
      msg({
        message: "Link",
        comment: "@context: Post format badge - link",
      }),
    ),
    quote: i18n._(
      msg({
        message: "Quote",
        comment: "@context: Post format badge - quote",
      }),
    ),
  };

  return <span class="badge-outline">{labels[type]}</span>;
};
