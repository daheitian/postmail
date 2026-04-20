import type { FC } from "hono/jsx";
import { Icon } from "./Icon.js";

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
    <Icon name="decorative-quote" />
  </span>
);
