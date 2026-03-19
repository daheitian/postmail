import { initComposeOpenShortcutDiscovery } from "./compose-discovery.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initComposeOpenShortcutDiscovery();
  });
} else {
  initComposeOpenShortcutDiscovery();
}
