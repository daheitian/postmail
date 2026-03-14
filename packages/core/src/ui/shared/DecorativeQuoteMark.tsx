import type { FC } from "hono/jsx";

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
    <svg viewBox="0 0 96 96" role="presentation" focusable="false">
      <path
        fill="currentColor"
        d="M24.4 10.5C16.9 17.7 11.5 26.8 8.2 37.7C4.9 48.7 4.8 58.9 7.8 68.2C10.3 75.7 15.4 79.5 22.9 79.5C28 79.5 32.2 77.8 35.4 74.2C38.6 70.7 40.2 66.5 40.2 61.4C40.2 56.5 38.8 52.6 36 49.6C33.3 46.6 29.7 45.1 25.2 45.1C23.4 45.1 21.8 45.3 20.2 45.8C22.2 37.3 26.7 29.2 33.6 21.4L24.4 10.5Z"
      />
      <path
        fill="currentColor"
        d="M60.8 10.5C53.3 17.7 47.9 26.8 44.6 37.7C41.3 48.7 41.2 58.9 44.2 68.2C46.7 75.7 51.8 79.5 59.3 79.5C64.4 79.5 68.6 77.8 71.8 74.2C75 70.7 76.6 66.5 76.6 61.4C76.6 56.5 75.2 52.6 72.4 49.6C69.7 46.6 66.1 45.1 61.6 45.1C59.8 45.1 58.2 45.3 56.6 45.8C58.6 37.3 63.1 29.2 70 21.4L60.8 10.5Z"
      />
    </svg>
  </span>
);
