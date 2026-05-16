/**
 * Shared helpers for reading Telegram settings status and rendering the
 * settings panel.
 *
 * Consumed by:
 * - GET  /settings/telegram                  — initial page render
 * - GET  /settings/telegram/status/stream    — live status polling loop that
 *   swaps the connect view for the connected view the moment a binding lands
 *
 * Both call sites render the same `<TelegramContent>` through
 * `renderTelegramContentHtml`, so any markup change flows to both
 * automatically.
 */
import type { Context } from "hono";
import { renderSVG } from "uqr";
import type { Bindings } from "../types.js";
import type { AppVariables } from "../types/app-context.js";
import { getTelegramBotPool } from "./env.js";
import { buildDeepLink, getMe } from "./telegram.js";
import { toPublicPath } from "./url.js";
import { I18nProvider } from "../i18n/context.js";
import {
  TelegramContent,
  type TelegramSettingsView,
} from "../ui/dash/settings/TelegramContent.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export type { TelegramSettingsView };

/**
 * Build the `TelegramSettingsView` for the current site. Mirrors what the
 * `/settings/telegram` GET route does, factored out so the SSE stream can
 * re-render exactly the same view.
 */
export async function readTelegramSettingsView(
  c: Context<Env>,
): Promise<TelegramSettingsView> {
  const pool = getTelegramBotPool(c.env);
  const managed = pool.length > 0;
  const status = await c.var.services.telegram.getStatus();

  // Public-facing bot username for the deep link / QR. The managed pool's
  // first bot is the public face; a bring-your-own bot already has its
  // username cached from setup.
  let botUsername = "";
  const firstBot = pool[0];
  if (firstBot) {
    try {
      const identity = await getMe(firstBot.token);
      botUsername = identity.username;
    } catch {
      botUsername = "";
    }
  } else if (status.userBot) {
    botUsername = status.userBot.username;
  }

  let connect: TelegramSettingsView["connect"] = null;
  if (!status.binding && botUsername) {
    const code = await c.var.services.telegram.getOrCreateCode();
    const deepLink = buildDeepLink(botUsername, code);
    connect = { code, deepLink, qrSvg: renderSVG(deepLink), botUsername };
  }

  return {
    managed,
    binding: status.binding
      ? {
          telegramUsername: status.binding.telegramUsername,
          boundAt: status.binding.boundAt,
        }
      : null,
    userBotConfigured: status.userBot !== null,
    connect,
  };
}

/**
 * Render the Telegram settings panel to an HTML string. The `streamUrl`,
 * when provided, mounts a Datastar SSE subscription on the connect view so
 * the page auto-swaps to the connected view the moment a binding lands.
 */
export function renderTelegramContentHtml(
  c: Context<Env>,
  view: TelegramSettingsView,
  streamUrl: string,
): string {
  // Hono JSX stringifies synchronously when the tree has no async children.
  // `TelegramContent` is sync, so `String(...)` returns plain HTML. The
  // I18nProvider binds the per-request i18n instance for `useLingui()`.
  return String(
    <I18nProvider c={c}>
      <TelegramContent
        view={view}
        sitePathPrefix={c.var.appConfig.sitePathPrefix}
        streamUrl={streamUrl}
      />
    </I18nProvider>,
  );
}

/** URL of the SSE endpoint that streams settings-panel patches. */
export function getTelegramStatusStreamUrl(c: Context<Env>): string {
  return toPublicPath(
    "/settings/telegram/status/stream",
    c.var.appConfig.sitePathPrefix,
  );
}
