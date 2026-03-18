import type { FC } from "hono/jsx";
import {
  JANT_LOGO_PATH_DATA,
  JANT_LOGO_VIEW_BOX,
  getJantLogoFills,
  type JantLogoVariant,
} from "../../lib/jant-branding.js";

interface JantBrandMarkProps {
  class?: string;
  variant?: JantLogoVariant;
  label?: string;
}

/**
 * Canonical Jant brand mark rendered inline so the site and the download
 * assets always share the same silhouette.
 */
export const JantBrandMark: FC<JantBrandMarkProps> = ({
  class: cls,
  variant = "positive",
  label,
}) => (
  <svg
    viewBox={JANT_LOGO_VIEW_BOX}
    class={`jant-brand-mark${cls ? ` ${cls}` : ""}`}
    style={`color:${getJantLogoFills()[variant]}`}
    role={label ? "img" : "presentation"}
    aria-label={label}
    aria-hidden={label ? undefined : "true"}
    focusable="false"
  >
    <path fill="currentColor" d={JANT_LOGO_PATH_DATA} />
  </svg>
);
