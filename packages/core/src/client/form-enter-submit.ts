/**
 * Enter-to-submit support for Datastar-managed forms.
 *
 * Browsers can be inconsistent about implicit submission when a form's
 * submit behavior is handled by client-side signal bindings. For the common
 * single-line input case, submit explicitly with requestSubmit().
 */

const TEXT_ENTRY_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function isEnterSubmitTarget(
  target: globalThis.EventTarget | null,
): target is HTMLInputElement {
  if (!(target instanceof HTMLInputElement)) {
    return false;
  }

  return (
    !target.disabled &&
    !target.readOnly &&
    TEXT_ENTRY_INPUT_TYPES.has(target.type.toLowerCase())
  );
}

function getEnabledSubmitter(
  form: HTMLFormElement,
): HTMLButtonElement | HTMLInputElement | null {
  return form.querySelector<HTMLButtonElement | HTMLInputElement>(
    'button[type="submit"]:not([disabled]), input[type="submit"]:not([disabled]), button:not([type]):not([disabled])',
  );
}

function hasSubmitControl(form: HTMLFormElement): boolean {
  return (
    form.querySelector(
      'button[type="submit"], input[type="submit"], button:not([type])',
    ) !== null
  );
}

document.addEventListener("keydown", (event: globalThis.KeyboardEvent) => {
  if (
    event.key !== "Enter" ||
    event.defaultPrevented ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  ) {
    return;
  }

  if (!isEnterSubmitTarget(event.target)) {
    return;
  }

  const form = event.target.form;
  if (
    !(form instanceof HTMLFormElement) ||
    !form.hasAttribute("data-on:submit__prevent")
  ) {
    return;
  }

  const submitter = getEnabledSubmitter(form);
  if (!submitter && hasSubmitControl(form)) {
    return;
  }

  event.preventDefault();

  if (submitter) {
    form.requestSubmit(submitter);
    return;
  }

  form.requestSubmit();
});
