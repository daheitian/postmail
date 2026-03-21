/**
 * Mock for @lingui/core/macro in the Vitest environment.
 *
 * The real module requires the Babel macro ecosystem which is not available
 * under Vitest. This mock replicates the *post-transformation* API surface:
 * `msg()` / `defineMessage()` return a MessageDescriptor whose `id` equals
 * the source `message`. At runtime `i18n._()` falls back to `message` when
 * the ID is not in the catalog, so English source strings propagate through.
 */

import type { MessageDescriptor } from "@lingui/core";

type MacroInput =
  | {
      id?: string;
      message: string;
      comment?: string;
      context?: string;
      values?: Record<string, unknown>;
    }
  | TemplateStringsArray;

function toDescriptor(
  input: MacroInput,
  ...args: unknown[]
): MessageDescriptor {
  if (typeof input === "object" && "message" in input) {
    return {
      id: input.message,
      message: input.message,
      ...(input.comment ? { comment: input.comment } : {}),
      ...(input.context ? { context: input.context } : {}),
      ...(input.values ? { values: input.values } : {}),
    } as MessageDescriptor;
  }
  // Template literal form: msg`some text`
  const raw = (input as TemplateStringsArray).reduce(
    (acc, str, i) => acc + str + (args[i] ?? ""),
    "",
  );
  return { id: raw, message: raw } as MessageDescriptor;
}

export const msg = toDescriptor;
export const t = toDescriptor;
export const defineMessage = toDescriptor;
