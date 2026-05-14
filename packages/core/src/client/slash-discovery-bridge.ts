import { initSlashCommandDiscovery } from "./slash-discovery.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initSlashCommandDiscovery();
  });
} else {
  initSlashCommandDiscovery();
}
