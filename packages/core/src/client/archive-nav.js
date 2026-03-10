/**
 * Archive Chip Dropdowns
 *
 * Handles popover open/close and option selection for chip-style filter
 * dropdowns.
 *
 * - Regular chips (.archive-chip-dropdown): click option → navigate to URL.
 * - Media chip (.archive-chip-media): multi-toggle for media kinds, with
 *   a special "Text only" option (data-navigate) that navigates immediately.
 *   Kind toggles navigate on popover close when the selection changed.
 */

document.querySelectorAll(".archive-chip-dropdown").forEach((chip) => {
  const trigger = chip.querySelector(":scope > button");
  const popover = chip.querySelector(":scope > [data-popover]");
  const listbox = popover
    ? popover.querySelector('[role="listbox"]')
    : null;
  if (!trigger || !popover || !listbox) return;

  const options = Array.from(listbox.querySelectorAll('[role="option"]'));
  const isMedia = chip.classList.contains("archive-chip-media");
  const filterKey = chip.dataset.filterKey;

  // --- Multi-select state (media chip only) ---------------------------------

  const selectedSet = new Set();
  if (isMedia) {
    options.forEach((opt) => {
      if (
        !opt.dataset.navigate &&
        opt.getAttribute("aria-selected") === "true"
      ) {
        selectedSet.add(opt.dataset.value);
      }
    });
  }
  let snapshotSelection = new Set(selectedSet);

  // --- Popover open / close -------------------------------------------------

  const open = () => {
    document.dispatchEvent(
      new CustomEvent("basecoat:popover", { detail: { source: chip } }),
    );
    popover.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    if (isMedia) snapshotSelection = new Set(selectedSet);
  };

  const close = (focusTrigger = true) => {
    if (popover.getAttribute("aria-hidden") === "true") return;
    popover.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    if (focusTrigger) trigger.focus();

    // Media multi-select: navigate if selection changed
    if (isMedia && filterKey) {
      const changed =
        selectedSet.size !== snapshotSelection.size ||
        [...selectedSet].some((v) => !snapshotSelection.has(v));
      if (changed) {
        const url = new URL(window.location.href);
        const values = [...selectedSet];
        if (values.length > 0) {
          url.searchParams.set(filterKey, values.join(","));
        } else {
          url.searchParams.delete(filterKey);
        }
        // Clear hasMedia when toggling kinds
        url.searchParams.delete("hasMedia");
        url.searchParams.delete("page");
        window.location.href = url.pathname + (url.search || "");
      }
    }
  };

  trigger.addEventListener("click", (e) => {
    if (e.target.closest(".archive-chip-clear")) return;
    if (trigger.getAttribute("aria-expanded") === "true") {
      close();
    } else {
      open();
    }
  });

  document.addEventListener("click", (e) => {
    if (!chip.contains(e.target)) close(false);
  });

  document.addEventListener("basecoat:popover", (e) => {
    if (e.detail.source !== chip) close(false);
  });

  // --- Option click ---------------------------------------------------------

  listbox.addEventListener("click", (e) => {
    const opt = e.target.closest('[role="option"]');
    if (!opt) return;

    // Immediate-navigate options (e.g. "Text only")
    if (opt.dataset.navigate) {
      const value = opt.dataset.value;
      if (typeof value === "string" && value.startsWith("/")) {
        window.location.href = value;
      }
      return;
    }

    if (isMedia) {
      // Multi-toggle for media kinds
      const val = opt.dataset.value;
      if (selectedSet.has(val)) {
        selectedSet.delete(val);
        opt.removeAttribute("aria-selected");
      } else {
        selectedSet.add(val);
        opt.setAttribute("aria-selected", "true");
      }
    } else {
      // Single-select: navigate to URL
      const value = opt.dataset.value;
      if (typeof value === "string" && value.startsWith("/")) {
        window.location.href = value;
      }
    }
  });

  // --- Keyboard navigation --------------------------------------------------

  let activeIndex = -1;

  const setActive = (index) => {
    if (activeIndex > -1 && options[activeIndex]) {
      options[activeIndex].classList.remove("active");
    }
    activeIndex = index;
    if (activeIndex > -1 && options[activeIndex]) {
      options[activeIndex].classList.add("active");
      options[activeIndex].scrollIntoView({ block: "nearest" });
    }
  };

  trigger.addEventListener("keydown", (e) => {
    const isOpen = popover.getAttribute("aria-hidden") === "false";

    if (e.key === "Escape") {
      if (isOpen) {
        e.preventDefault();
        close();
      }
      return;
    }

    if (!isOpen && ["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      open();
      return;
    }

    if (!isOpen) return;
    e.preventDefault();

    if (e.key === "ArrowDown") {
      setActive(Math.min(activeIndex + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      setActive(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Enter" && activeIndex > -1) {
      options[activeIndex].click();
      if (!isMedia && !options[activeIndex].dataset.navigate) close();
    }
  });
});
