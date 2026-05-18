/**
 * Telegram managed-pool webhook registration.
 *
 * In hosted mode the bot pool is platform-owned (`TELEGRAM_BOT_TOKENS`) and
 * there is no settings-page action that would register its webhooks. Rather
 * than make the operator run a CLI step, the Node server self-registers on
 * startup: it derives the webhook URL from `HOSTED_CONTROL_PLANE_BASE_URL`
 * (the public control-plane host that forwards to core) and points each pool
 * bot at `<base>/api/telegram/webhook/<botId>`.
 *
 * This is gated on `HOSTED_CONTROL_PLANE_BASE_URL` being set, so a local dev
 * box with `TELEGRAM_BOT_TOKENS` in its env never touches Telegram. It is
 * idempotent — a `getWebhookInfo` check skips bots already pointed at the
 * right URL, so a steady-state restart issues only cheap reads. Callers run
 * it fire-and-forget; it must never block or fail startup.
 */

import {
  getHostedControlPlaneBaseUrl,
  getTelegramBotPool,
  getTelegramWebhookSecret,
} from "./env.js";
import { getWebhookUrl, setMyCommands, setWebhook } from "./telegram.js";

/**
 * Registers webhooks for every managed-pool bot, skipping those already
 * pointed at the correct URL. No-ops when the pool is unset, the deployment
 * is not hosted, or no shared webhook secret is configured.
 *
 * @param env - Runtime environment bindings
 */
export async function registerTelegramPoolWebhooks(
  env: object | undefined | null,
): Promise<void> {
  const pool = getTelegramBotPool(env);
  if (pool.length === 0) return;

  const baseUrl = getHostedControlPlaneBaseUrl(env);
  if (!baseUrl) {
    // Not a hosted deployment — the pool, if present, is for local testing
    // and must not have its webhooks touched automatically.
    return;
  }

  const secret = getTelegramWebhookSecret(env);
  if (!secret) {
    // eslint-disable-next-line no-console -- Misconfiguration must be visible.
    console.error(
      "[Jant] TELEGRAM_BOT_TOKENS is set but TELEGRAM_WEBHOOK_SECRET is missing — skipping webhook registration.",
    );
    return;
  }

  const origin = baseUrl.replace(/\/+$/, "");
  for (const bot of pool) {
    const webhookUrl = `${origin}/api/telegram/webhook/${bot.botId}`;
    try {
      const current = await getWebhookUrl(bot.token);
      if (current !== webhookUrl) {
        await setWebhook(bot.token, webhookUrl, secret);
        // eslint-disable-next-line no-console -- One-line audit trail for a rare write.
        console.log(`[Jant] Telegram webhook registered: bot=${bot.botId}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console -- Registration failures must be visible.
      console.error(
        `[Jant] Telegram webhook registration failed: bot=${bot.botId} error=${message}`,
      );
      // Webhook failed — skip command sync too; the bot isn't usable anyway.
      continue;
    }
    // Command list is independent of the webhook URL. Re-run unconditionally
    // so existing deployments pick up command changes without a re-register,
    // and so the `/` autocomplete reflects the latest list.
    try {
      await setMyCommands(bot.token);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console -- Polish failure — visible but non-fatal.
      console.error(
        `[Jant] Telegram setMyCommands failed: bot=${bot.botId} error=${message}`,
      );
    }
  }
}
