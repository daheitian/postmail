/**
 * Post Form Bridge
 *
 * Connects <jant-post-form> to the server by handling:
 * - `jant:post-submit` → POST JSON and redirect on success
 * - `jant:post-load-media` → fetch media picker HTML and manage selections
 */

import type { PostSubmitDetail } from "../ui/components/post-form-types.js";
import type { JantPostForm } from "../ui/components/jant-post-form.js";

type ToastType = "success" | "error";

function showToast(message: string, type: ToastType = "success") {
  if (!message) return;
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icon =
    type === "error"
      ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>';

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

function findPostForm(
  target: globalThis.EventTarget | null,
): JantPostForm | null {
  if (target instanceof HTMLElement && target.tagName === "JANT-POST-FORM") {
    return target as JantPostForm;
  }
  if (target instanceof HTMLElement) {
    return target.closest("jant-post-form") as JantPostForm | null;
  }
  return document.querySelector("jant-post-form");
}

function applyMediaSelection(el: HTMLElement, selected: boolean) {
  el.classList.toggle("ring-2", selected);
  el.classList.toggle("ring-primary", selected);
  el.classList.toggle("border-primary", selected);
}

async function handlePostSubmit(event: Event) {
  const customEvent = event as CustomEvent<PostSubmitDetail>;
  const detail = customEvent.detail;
  if (!detail) return;

  const formEl = findPostForm(customEvent.target);
  if (!formEl || !detail.endpoint) return;

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
      let message = detail.messages.error;
      try {
        const json = await res.json();
        if (typeof json?.error === "string") message = json.error;
        else if (typeof json?.message === "string") message = json.message;
      } catch {
        // Ignore JSON parse failure; keep fallback message.
      }
      throw new Error(message);
    }

    const json = await res.json();

    if (json?.status === "redirect" && typeof json.url === "string") {
      window.location.href = json.url;
      return;
    }

    showToast(detail.messages.success);
  } catch (err) {
    const message =
      err instanceof Error && err.message ? err.message : detail.messages.error;
    showToast(message, "error");
  } finally {
    formEl.loading = false;
  }
}

async function handleMediaLoad(event: Event) {
  const customEvent = event as CustomEvent<{
    endpoint: string;
    selectedIds: string[];
  }>;
  const detail = customEvent.detail;
  if (!detail?.endpoint) return;

  const grid = document.getElementById("post-media-grid");
  const formEl = findPostForm(customEvent.target);
  if (!grid || !formEl) return;

  try {
    grid.innerHTML =
      '<p class="text-muted-foreground text-sm col-span-4">Loading...</p>';

    const res = await fetch(detail.endpoint, {
      headers: { Accept: "text/html" },
    });
    const html = await res.text();
    grid.innerHTML = html;
  } catch {
    grid.innerHTML =
      '<p class="text-red-500 text-sm col-span-4">Failed to load media.</p>';
    return;
  }

  const selected = new Set(detail.selectedIds);

  grid.querySelectorAll<HTMLElement>("[data-media-id]").forEach((el) => {
    const id = el.dataset.mediaId;
    if (!id) return;
    applyMediaSelection(el, selected.has(id));
  });

  grid.onclick = (e: Event) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-media-id]",
    );
    if (!target) return;
    const id = target.dataset.mediaId;
    if (!id) return;

    const current = new Set(formEl.mediaIds);
    if (current.has(id)) {
      current.delete(id);
      applyMediaSelection(target, false);
    } else {
      current.add(id);
      applyMediaSelection(target, true);
    }
    formEl.mediaIds = [...current];
  };
}

document.addEventListener("jant:post-submit", handlePostSubmit);
document.addEventListener("jant:post-load-media", handleMediaLoad);
