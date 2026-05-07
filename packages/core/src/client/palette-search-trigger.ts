/**
 * Header search-link click handler (auth-only).
 *
 * Intercepts clicks on `.site-header-search-link` (the magnifying-glass icon
 * shown when the inline search form collapses) and opens the command palette
 * instead of navigating to /search. The anchor's `href` remains a working
 * fallback for anonymous visitors (this script is not loaded for them) and
 * for modifier-clicks that should open a new tab.
 */

import type { JantCommandPalette } from "./components/jant-command-palette.js";

document.addEventListener("click", (event: globalThis.MouseEvent) => {
  const target = event.target;
  if (!(target instanceof globalThis.Element)) return;

  const link = target.closest<HTMLAnchorElement>(".site-header-search-link");
  if (!link) return;

  // Let modifier-clicks fall through (new tab/window, save link, etc.)
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.button !== 0) return;
  if (event.defaultPrevented) return;

  const palette = document.querySelector<JantCommandPalette>(
    "jant-command-palette",
  );
  if (!palette) return;

  // Skip if another dialog (compose, confirm) is already open
  if (document.querySelector("dialog[open]")) return;

  event.preventDefault();
  void palette.open();
});
