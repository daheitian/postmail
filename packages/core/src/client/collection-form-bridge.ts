/**
 * Collection Form Bridge
 *
 * Handles full-page collection editor submissions.
 * Quick-create flows inside compose and timeline intercept the same event
 * locally, so only page-level forms reach this bridge.
 */

import type { CollectionSubmitDetail } from "./components/collection-types.js";
import type { JantCollectionForm } from "./components/jant-collection-form.js";
import { publicPath } from "./runtime-paths.js";
import { showToast } from "./toast.js";

document.addEventListener("jant:collection-submit", async (event: Event) => {
  const customEvent = event as CustomEvent<CollectionSubmitDetail>;
  const detail = customEvent.detail;
  const formEl =
    customEvent.target instanceof HTMLElement
      ? (customEvent.target as JantCollectionForm)
      : document.querySelector<JantCollectionForm>("jant-collection-form");
  const pageRoot = formEl?.closest<HTMLElement>(
    "[data-collection-editor-page]",
  );

  if (!detail?.endpoint || !formEl || !pageRoot) return;

  formEl.loading = true;

  try {
    const res = await fetch(detail.endpoint, {
      method: detail.isEdit ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(detail.data),
    });
    const json = (await res.json().catch(() => null)) as {
      slug?: string;
      error?: string;
    } | null;

    if (!res.ok) {
      throw new Error(
        json?.error ||
          pageRoot.dataset.collectionEditorSaveFailed ||
          "Couldn't save. Try again in a moment.",
      );
    }

    const redirectUrl =
      detail.isEdit && typeof json?.slug === "string" && json.slug.length > 0
        ? publicPath(`/c/${json.slug}`)
        : formEl.cancelHref || publicPath("/c");

    window.location.href = redirectUrl;
    return;
  } catch (error) {
    showToast(
      error instanceof Error
        ? error.message
        : pageRoot.dataset.collectionEditorSaveFailed ||
            "Couldn't save. Try again in a moment.",
      "error",
    );
  } finally {
    formEl.loading = false;
  }
});
