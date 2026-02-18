/**
 * Type declarations for @lingui/react/macro
 *
 * @lingui/react is not installed (it requires React as a peer dependency),
 * but the SWC Lingui plugin recognizes imports from @lingui/react/macro and
 * rewrites them via runtimeConfigModule to our custom Hono JSX implementation.
 *
 * These declarations satisfy TypeScript for the pre-transformation API surface.
 */

declare module "@lingui/react/macro" {
  import type { I18n, MessageDescriptor } from "@lingui/core";
  import type { FC, PropsWithChildren } from "hono/jsx";

  interface TranslationDescriptor {
    id?: string;
    message: string;
    comment?: string;
    values?: Record<string, unknown>;
  }

  export function useLingui(): {
    t: (descriptor: TranslationDescriptor | MessageDescriptor) => string;
    _: (descriptor: TranslationDescriptor | MessageDescriptor) => string;
    i18n: I18n;
  };

  export const Trans: FC<
    PropsWithChildren<{
      comment?: string;
      id?: string;
    }>
  >;
}
