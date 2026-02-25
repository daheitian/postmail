/**
 * Collection Form Bridge
 *
 * Handles communication between <jant-collection-form> and the server.
 * Listens for `jant:collection-submit`, POSTs JSON to the endpoint, and
 * redirects on success. Displays toasts on failure.
 */

import type { CollectionSubmitDetail } from "./components/collection-types.js";
import type { JantCollectionForm } from "./components/jant-collection-form.js";
import { showToast } from "./toast.js";

document.addEventListener("jant:collection-submit", async (event: Event) => {
  const customEvent = event as CustomEvent<CollectionSubmitDetail>;
  const detail = customEvent.detail;
  const formEl =
    customEvent.target instanceof HTMLElement
      ? (customEvent.target as JantCollectionForm)
      : document.querySelector<JantCollectionForm>("jant-collection-form");

  if (!detail?.endpoint || !formEl) return;

  formEl.loading = true;

  try {
    const res = await fetch(detail.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(detail.data),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (json?.status === "redirect" && typeof json.url === "string") {
      window.location.href = json.url;
      return;
    }

    showToast("Saved successfully.");
  } catch {
    showToast("Failed to save collection. Please try again.", "error");
  } finally {
    formEl.loading = false;
  }
});
