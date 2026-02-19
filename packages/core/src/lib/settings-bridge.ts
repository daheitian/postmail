/**
 * Settings Bridge
 *
 * Handles server communication for the Lit settings components.
 * Listens for `jant:settings-save` and `jant:avatar-remove` events,
 * POSTs to the server, and handles the response (toast, DOM updates).
 */

import type {
  SettingsSaveDetail,
  AvatarRemoveDetail,
} from "../ui/components/settings-types.js";
import type { JantSettingsGeneral } from "../ui/components/jant-settings-general.js";
import type { JantSettingsAvatar } from "../ui/components/jant-settings-avatar.js";

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

function updateSidebarSiteName(siteName: string) {
  const el = document.getElementById("site-name");
  if (el) el.textContent = siteName;
  const titleEl = document.querySelector("title");
  if (titleEl) titleEl.textContent = `Settings - ${siteName}`;
}

// ── Settings save handler ───────────────────────────────────────────

document.addEventListener("jant:settings-save", async (e: Event) => {
  const event = e as CustomEvent<SettingsSaveDetail>;
  const { endpoint, data, section } = event.detail;

  const generalEl = document.querySelector<JantSettingsGeneral>(
    "jant-settings-general",
  );
  const avatarEl = document.querySelector<JantSettingsAvatar>(
    "jant-settings-avatar",
  );

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (json.status === "redirect") {
      window.location.href = json.url;
      return;
    }

    if (json.toast) {
      showToast(json.toast);
    }

    // Update sidebar site name when general settings are saved
    if (section === "general" && json.siteName) {
      updateSidebarSiteName(json.siteName);
    }

    // Notify the component that save succeeded
    if (section === "avatar-display") {
      avatarEl?.saved();
    } else {
      generalEl?.sectionSaved(section);
    }
  } catch {
    showToast("Failed to save. Please try again.", "error");

    if (section === "avatar-display") {
      avatarEl?.saveError();
    } else {
      generalEl?.sectionError(section);
    }
  }
});

// ── Avatar remove handler ───────────────────────────────────────────

document.addEventListener("jant:avatar-remove", async (e: Event) => {
  const event = e as CustomEvent<AvatarRemoveDetail>;
  const { endpoint } = event.detail;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    if (json.status === "redirect") {
      window.location.href = json.url;
      return;
    }
  } catch {
    showToast("Failed to remove avatar. Please try again.", "error");
  }
});

// ── Initialize form data from server-rendered JSON ──────────────────

function initSettingsData() {
  const el = document.querySelector<JantSettingsGeneral>(
    "jant-settings-general",
  );
  if (!el) return;

  const dataEl = document.getElementById("settings-initial-data");
  if (!dataEl?.textContent) return;

  try {
    const data = JSON.parse(dataEl.textContent);
    el.initData(data);
  } catch {
    // Data parsing failed, form will use defaults
  }
}

// Run after Lit components have upgraded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSettingsData);
} else {
  // Use microtask to let custom elements upgrade first
  queueMicrotask(initSettingsData);
}
