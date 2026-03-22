// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";
import "../form-enter-submit.js";

function createEnterEvent(
  init: Partial<globalThis.KeyboardEventInit> & { isComposing?: boolean } = {},
): globalThis.KeyboardEvent {
  const event = new globalThis.KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "Enter",
    ...init,
  });

  if (init.isComposing) {
    Object.defineProperty(event, "isComposing", {
      configurable: true,
      value: true,
    });
  }

  return event;
}

function createManagedForm() {
  const form = document.createElement("form");
  form.setAttribute("data-on:submit__prevent", "");

  const input = document.createElement("input");
  input.type = "text";

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Submit";

  const requestSubmit = vi.fn();
  form.requestSubmit = requestSubmit as typeof form.requestSubmit;

  form.appendChild(input);
  form.appendChild(submit);
  document.body.appendChild(form);

  return { form, input, submit, requestSubmit };
}

describe("form-enter-submit", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("submits Datastar-managed forms when Enter is pressed in a text input", () => {
    const { input, submit, requestSubmit } = createManagedForm();
    const event = createEnterEvent();

    input.dispatchEvent(event);

    expect(requestSubmit).toHaveBeenCalledOnce();
    expect(requestSubmit).toHaveBeenCalledWith(submit);
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores Enter in textarea fields", () => {
    const { form, submit } = createManagedForm();
    const textarea = document.createElement("textarea");
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit as typeof form.requestSubmit;
    form.insertBefore(textarea, submit);

    textarea.dispatchEvent(createEnterEvent());

    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it("does not force submit while IME composition is active", () => {
    const { input, requestSubmit } = createManagedForm();

    input.dispatchEvent(createEnterEvent({ isComposing: true }));

    expect(requestSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when the submit control is disabled", () => {
    const { input, submit, requestSubmit } = createManagedForm();
    submit.disabled = true;
    const event = createEnterEvent();

    input.dispatchEvent(event);

    expect(requestSubmit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not affect forms outside Datastar-managed submit handlers", () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    input.type = "text";
    const submit = document.createElement("button");
    submit.type = "submit";
    const requestSubmit = vi.fn();
    form.requestSubmit = requestSubmit as typeof form.requestSubmit;
    form.appendChild(input);
    form.appendChild(submit);
    document.body.appendChild(form);

    input.dispatchEvent(createEnterEvent());

    expect(requestSubmit).not.toHaveBeenCalled();
  });
});
