import type { FC } from "hono/jsx";
import {
  DECORATIVE_QUOTE_MARK_PATHS,
  DECORATIVE_QUOTE_MARK_VIEWBOX,
} from "../../lib/decorative-quote-mark.js";

interface DecorativeQuoteMarkProps {
  class?: string;
  direction?: "open" | "close";
}

/**
 * Decorative double-quote mark rendered as SVG so the shape stays consistent
 * across platforms instead of inheriting each OS serif glyph.
 */
export const DecorativeQuoteMark: FC<DecorativeQuoteMarkProps> = ({
  class: cls,
  direction = "open",
}) => (
  <span
    class={`decorative-quote-mark${cls ? ` ${cls}` : ""}`}
    data-direction={direction}
    aria-hidden="true"
  >
    <svg
      viewBox={DECORATIVE_QUOTE_MARK_VIEWBOX}
      role="presentation"
      focusable="false"
    >
      {DECORATIVE_QUOTE_MARK_PATHS.map((path) => (
        <path fill="currentColor" d={path} />
      ))}
    </svg>
  </span>
);
