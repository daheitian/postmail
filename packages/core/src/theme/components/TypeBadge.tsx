/**
 * Format Badge Component
 *
 * Displays a badge indicating the format of a post (note, link, quote).
 * Named TypeBadge for backward compatibility with theme overrides.
 */

import type { FC } from "hono/jsx";
import { useLingui } from "@lingui/react/macro";
import type { Format } from "../../types.js";

export interface TypeBadgeProps {
  type: Format;
}

export const TypeBadge: FC<TypeBadgeProps> = ({ type }) => {
  const { t } = useLingui();

  const labels: Record<Format, string> = {
    note: t({ message: "Note", comment: "@context: Post format badge - note" }),
    link: t({ message: "Link", comment: "@context: Post format badge - link" }),
    quote: t({
      message: "Quote",
      comment: "@context: Post format badge - quote",
    }),
  };

  return <span class="badge-outline">{labels[type]}</span>;
};
