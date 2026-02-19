/**
 * Collection Form Bridge
 *
 * Handles communication between <jant-collection-form> and the server.
 * Listens for `jant:collection-submit`, POSTs JSON to the endpoint, and
 * redirects on success. Displays toasts on failure.
 */

import type { CollectionSubmitDetail } from "../ui/components/collection-types.js";
import type { JantCollectionForm } from "../ui/components/jant-collection-form.js";

function showToast(message: string, type: "success" | "error" = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon =
    type === "error"
      ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

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
  } catch (err) {
    console.error(err);
    showToast("Failed to save collection. Please try again.", "error");
  } finally {
    formEl.loading = false;
  }
});
