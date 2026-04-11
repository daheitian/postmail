/**
 * Keyboard shortcut for the command palette.
 *
 * Cmd+K (Mac) / Ctrl+K (Windows/Linux) toggles the palette.
 * Does not conflict with compose-shortcuts.ts which ignores modified keys.
 */

import type { JantCommandPalette } from "./components/jant-command-palette.js";

document.addEventListener("keydown", (event: globalThis.KeyboardEvent) => {
  if (event.key.toLowerCase() !== "k") return;
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.altKey || event.shiftKey) return;
  if (event.defaultPrevented || event.isComposing) return;

  event.preventDefault();

  const palette = document.querySelector<JantCommandPalette>(
    "jant-command-palette",
  );
  if (!palette) return;

  // Toggle: if palette is already open, close it
  const paletteDialog =
    palette.querySelector<HTMLDialogElement>("dialog[open]");
  if (paletteDialog) {
    palette.close();
    return;
  }

  // Skip if another dialog (compose, confirm) is already open
  if (document.querySelector("dialog[open]")) return;

  void palette.open();
});
