/**
 * Page Slug Bridge
 *
 * Auto-generates a slug from the page title in create mode.
 * Listens for `input` events on the title field inside `[data-page-form]`
 * and writes the slugified value into the slug input, dispatching an
 * `input` event so Datastar picks up the signal change.
 *
 * Skipped in edit mode (detected via `data-page-edit` attribute).
 */

import { preloadSlug, slugify } from "./lazy-slugify.js";

function init() {
  const form = document.querySelector<HTMLFormElement>("[data-page-form]");
  if (!form || form.hasAttribute("data-page-edit")) return;

  preloadSlug();

  const titleInput = form.querySelector<HTMLInputElement>(
    '[data-bind="title"]',
  );
  const slugInput = form.querySelector<HTMLInputElement>('[data-bind="slug"]');
  if (!titleInput || !slugInput) return;

  titleInput.addEventListener("input", () => {
    const currentTitle = titleInput.value;
    slugify(currentTitle).then((slug) => {
      if (titleInput.value === currentTitle) {
        slugInput.value = slug;
        slugInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
  });
}

// Run on DOMContentLoaded if the document isn't ready yet, otherwise run now.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
