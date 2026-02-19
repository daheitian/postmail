/**
 * Compose Bridge
 *
 * Handles server communication between the Lit compose dialog and the server.
 * Listens for jant:compose-submit events, POSTs to /compose, and handles
 * the JSON response (timeline prepend, dialog close, toast, Lit reset).
 */

import type { ComposeSubmitDetail } from "../ui/components/compose-types.js";
import type { JantComposeDialog } from "../ui/components/jant-compose-dialog.js";

// ── Toast utility ─────────────────────────────────────────────────

function showToast(message: string, type: "success" | "error" = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const cls = type === "error" ? "toast-error" : "toast-success";
  const icon =
    type === "error"
      ? '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

  const toast = document.createElement("div");
  toast.className = `toast ${cls}`;
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

// ── Submit handler ────────────────────────────────────────────────

document.addEventListener("jant:compose-submit", async (e: Event) => {
  const event = e as CustomEvent<ComposeSubmitDetail>;
  const detail = event.detail;
  const dialog = document.getElementById(
    "compose-dialog",
  ) as HTMLDialogElement | null;
  const composeEl = document.querySelector(
    "jant-compose-dialog",
  ) as JantComposeDialog | null;

  if (!composeEl) return;
  composeEl.loading = true;

  try {
    const res = await fetch("/compose", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        format: detail.format,
        title: detail.title || undefined,
        body: detail.body || undefined,
        url: detail.url || undefined,
        quoteText: detail.quoteText || undefined,
        status: detail.status,
        rating: detail.rating || undefined,
        collectionIds:
          detail.collectionIds.length > 0 ? detail.collectionIds : undefined,
        mediaIds: detail.mediaIds.length > 0 ? detail.mediaIds : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      showToast(data.error ?? "Something went wrong", "error");
      return;
    }

    const data = await res.json();

    if (data.status === "draft") {
      showToast(data.toast ?? "Draft saved.");
    } else if (data.status === "published" && data.cardHtml) {
      const timeline = document.getElementById("timeline-items");
      if (timeline) {
        timeline.insertAdjacentHTML("afterbegin", data.cardHtml);
      }
    }

    dialog?.close();
    composeEl.reset();
  } catch {
    showToast("Something went wrong", "error");
  } finally {
    composeEl.loading = false;
  }
});

// ── Media picker bridge ───────────────────────────────────────────

document.addEventListener("jant:load-media-picker", async () => {
  const grid = document.getElementById("compose-media-grid");
  if (!grid) return;

  try {
    const res = await fetch("/dash/media/picker");
    const html = await res.text();
    grid.innerHTML = html;

    // Wire up media item click handlers
    const composeEl = document.querySelector(
      "jant-compose-dialog",
    ) as JantComposeDialog | null;
    if (!composeEl) return;

    grid.addEventListener("click", (e: Event) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-media-id]",
      );
      if (!target) return;

      const mediaId = target.dataset.mediaId;
      if (!mediaId) return;

      const currentIds = [...(composeEl._mediaIds ?? [])];
      const idx = currentIds.indexOf(mediaId);
      if (idx >= 0) {
        currentIds.splice(idx, 1);
        target.classList.remove("ring-2", "ring-primary");
      } else {
        currentIds.push(mediaId);
        target.classList.add("ring-2", "ring-primary");
      }
      composeEl.mediaIds = currentIds;
    });
  } catch {
    grid.innerHTML =
      '<p class="text-muted-foreground text-sm col-span-4">Failed to load media.</p>';
  }
});
