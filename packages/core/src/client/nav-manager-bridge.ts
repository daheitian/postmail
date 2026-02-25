/**
 * Nav Manager Bridge
 *
 * Handles communication between <jant-nav-manager> and the server.
 * Listens for `jant:nav-update` and `jant:nav-delete`, calls API endpoints,
 * and reloads the page on success.
 */

import type {
  NavManagerUpdateDetail,
  NavManagerDeleteDetail,
} from "./components/nav-manager-types.js";
import { showToast } from "./toast.js";

document.addEventListener("jant:nav-update", async (event: Event) => {
  const { detail } = event as CustomEvent<NavManagerUpdateDetail>;
  if (!detail?.id) return;

  try {
    const res = await fetch(`/api/nav-items/${detail.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        label: detail.label,
        ...(detail.url !== undefined && { url: detail.url }),
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window.location.reload();
  } catch {
    showToast("Failed to save. Please try again.", "error");
  }
});

document.addEventListener("jant:nav-delete", async (event: Event) => {
  const { detail } = event as CustomEvent<NavManagerDeleteDetail>;
  if (!detail?.id) return;

  try {
    const res = await fetch(`/api/nav-items/${detail.id}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    window.location.reload();
  } catch {
    showToast("Failed to delete. Please try again.", "error");
  }
});
