/**
 * Telegram Webhook Route
 *
 * Receives Telegram bot updates and turns text messages into Notes.
 *
 * One route serves both deployment modes. It is host-agnostic: it never
 * trusts the request hostname (in hosted mode the update is forwarded through
 * the control plane and arrives without a tenant host). The target site is
 * resolved from the binding tables — by `(botId, telegramUserId)` for a normal
 * message, or by the pending binding `code` for a `/start <code>`.
 *
 * Authentication is the Telegram `secret_token` echoed in the
 * `X-Telegram-Bot-Api-Secret-Token` header — the same auth model whether the
 * webhook is delivered straight to a self-hosted site or forwarded by the
 * hosted control plane.
 */

import { Hono } from "hono";
import type { Bindings } from "../../types.js";
import type { AppVariables } from "../../types/app-context.js";
import { getTelegramBotPool, getTelegramWebhookSecret } from "../../lib/env.js";
import { timingSafeEqualText } from "../../lib/crypto.js";
import {
  answerCallbackQuery,
  buildDeepLink,
  getMe,
  sendMessage,
  type TelegramInlineButton,
  type TelegramUpdate,
} from "../../lib/telegram.js";

type Env = { Bindings: Bindings; Variables: AppVariables };

export const telegramWebhookRoutes = new Hono<Env>();

/**
 * Bot id → username cache. `getMe` results are stable for a bot's lifetime,
 * so this avoids an API round-trip per webhook when building deep links.
 */
const botUsernameCache = new Map<string, string>();

async function resolveBotUsername(
  botId: string,
  token: string,
): Promise<string> {
  const cached = botUsernameCache.get(botId);
  if (cached) return cached;
  try {
    const identity = await getMe(token);
    if (identity.username) {
      botUsernameCache.set(botId, identity.username);
    }
    return identity.username;
  } catch {
    return "";
  }
}

/** Resolves the bot token + expected webhook secret for an incoming request. */
async function resolveBot(
  c: { env: Bindings; var: AppVariables },
  botId: string,
): Promise<{ token: string; secret: string } | null> {
  const pool = getTelegramBotPool(c.env);
  if (pool.length > 0) {
    const bot = pool.find((entry) => entry.botId === botId);
    const secret = getTelegramWebhookSecret(c.env);
    if (!bot || !secret) return null;
    return { token: bot.token, secret };
  }

  // Bring-your-own bot: config lives in the resolved site's settings. The
  // webhook hits the site's own host in this mode, so `c.var.services` is
  // already scoped to the right site.
  const settings = c.var.services.settings;
  const storedBotId = await settings.get("TELEGRAM_BOT_ID");
  if (storedBotId !== botId) return null;
  const token = await settings.get("TELEGRAM_BOT_TOKEN");
  const secret = await settings.get("TELEGRAM_BOT_WEBHOOK_SECRET");
  if (!token || !secret) return null;
  return { token, secret };
}

async function siteName(
  c: { var: AppVariables },
  siteId: string,
): Promise<string> {
  const name = await c.var.servicesForSite(siteId).settings.get("SITE_NAME");
  return name && name.trim() ? name.trim() : "your site";
}

telegramWebhookRoutes.post("/webhook/:botId", async (c) => {
  const botId = c.req.param("botId");
  const bot = await resolveBot(c, botId);
  if (!bot) {
    return c.json({ error: "Unknown bot" }, 404);
  }

  const providedSecret = c.req.header("X-Telegram-Bot-Api-Secret-Token") ?? "";
  if (!timingSafeEqualText(providedSecret, bot.secret)) {
    return c.json({ error: "Invalid secret token" }, 401);
  }

  let update: TelegramUpdate;
  try {
    update = (await c.req.json()) as TelegramUpdate;
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  // Telegram retries failed deliveries; a slow handler causes duplicate
  // posts. Process inline (posting a note is fast) but never let an error
  // escape — Telegram only needs a 200, and the user-facing error goes back
  // as a chat message.
  try {
    await processUpdate(c, update, botId, bot.token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console -- Webhook failures must be visible in server logs.
    console.error(`[Jant] Telegram webhook error: ${message}`);
  }

  return c.json({ ok: true });
});

async function processUpdate(
  c: { env: Bindings; var: AppVariables },
  update: TelegramUpdate,
  botId: string,
  botToken: string,
): Promise<void> {
  const telegram = c.var.services.telegram;

  // --- Inline keyboard tap (ambiguous-bind resolution) ---
  if (update.callback_query) {
    const query = update.callback_query;
    await answerCallbackQuery(botToken, query.id);
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const [action, code] = (query.data ?? "").split(":");
    const pending = code ? await telegram.resolvePendingCode(code) : null;
    if (!pending) {
      await sendMessage(
        botToken,
        chatId,
        "That binding code expired. Open Telegram settings in Jant for a fresh one.",
      );
      return;
    }
    if (action === "rebind") {
      await telegram.bindAccount({
        siteId: pending.siteId,
        botId,
        telegramUserId: String(query.from.id),
        telegramUsername: query.from.username ?? null,
      });
      await sendMessage(
        botToken,
        chatId,
        `Connected to ${await siteName(c, pending.siteId)}. Send me any text and I'll post it as a note.`,
      );
    }
    return;
  }

  // --- Message ---
  const message = update.message;
  if (!message?.from) return;
  const chatId = message.chat.id;
  const telegramUserId = String(message.from.id);
  const text = (message.text ?? "").trim();

  // `/start <code>` — binding flow.
  if (text === "/start" || text.startsWith("/start ")) {
    const code = text.slice("/start".length).trim();
    if (!code) {
      await sendMessage(
        botToken,
        chatId,
        "Open Telegram settings in Jant and tap Connect to link this chat.",
      );
      return;
    }
    await handleStart(c, {
      botId,
      botToken,
      chatId,
      code,
      telegramUserId,
      telegramUsername: message.from.username ?? null,
    });
    return;
  }

  // Plain message — publish as a note.
  const binding = await telegram.findBindingByUser(botId, telegramUserId);
  if (!binding) {
    // Defensive: users who copy the binding code without the `/start `
    // prefix still get bound. The settings page formats the code as
    // `/start CODE`, but a fraction of users will paste only the trailing
    // token. Codes are lowercase alphanumeric (see lib/nanoid.ts) and
    // short, so the false-positive surface is tiny.
    if (/^[0-9a-z]+$/.test(text) && text.length <= 24) {
      const pending = await telegram.resolvePendingCode(text);
      if (pending) {
        await handleStart(c, {
          botId,
          botToken,
          chatId,
          code: text,
          telegramUserId,
          telegramUsername: message.from.username ?? null,
        });
        return;
      }
    }
    await sendMessage(
      botToken,
      chatId,
      "This chat isn't connected yet. Open Telegram settings in Jant to get a binding code.",
    );
    return;
  }
  // Retry de-duplication: Telegram resends on a missed 200.
  if (
    binding.lastUpdateId !== null &&
    update.update_id <= binding.lastUpdateId
  ) {
    return;
  }
  if (!text) {
    await sendMessage(
      botToken,
      chatId,
      "I can only post text notes right now.",
    );
    return;
  }

  await c.var.servicesForSite(binding.siteId).posts.create({
    format: "note",
    bodyMarkdown: text,
    status: "published",
    visibility: "public",
  });
  await telegram.markUpdateProcessed(binding.id, update.update_id);
  await sendMessage(botToken, chatId, "Posted.");
}

async function handleStart(
  c: { env: Bindings; var: AppVariables },
  input: {
    botId: string;
    botToken: string;
    chatId: number;
    code: string;
    telegramUserId: string;
    telegramUsername: string | null;
  },
): Promise<void> {
  const telegram = c.var.services.telegram;
  const pending = await telegram.resolvePendingCode(input.code);
  if (!pending) {
    await sendMessage(
      input.botToken,
      input.chatId,
      "That binding code is invalid or expired. Get a fresh one from Jant settings.",
    );
    return;
  }

  const existing = await telegram.findBindingByUser(
    input.botId,
    input.telegramUserId,
  );

  // Already connected through this bot to the same site — nothing to do.
  if (existing && existing.siteId === pending.siteId) {
    await sendMessage(
      input.botToken,
      input.chatId,
      "This chat is already connected. Send me any text to post a note.",
    );
    return;
  }

  // This bot is taken by a different site. The intent is ambiguous — the
  // user might want to move this bot, or keep it and use a free pool bot for
  // the new site — so offer an explicit choice instead of guessing.
  if (existing) {
    const buttons: TelegramInlineButton[][] = [
      [
        {
          text: `Rebind this bot to ${await siteName(c, pending.siteId)}`,
          callback_data: `rebind:${input.code}`,
        },
      ],
    ];
    for (const other of getTelegramBotPool(c.env)) {
      if (other.botId === input.botId) continue;
      const taken = await telegram.findBindingByUser(
        other.botId,
        input.telegramUserId,
      );
      if (taken) continue;
      const username = await resolveBotUsername(other.botId, other.token);
      if (!username) continue;
      buttons.push([
        {
          text: `Connect to @${username} instead`,
          url: buildDeepLink(username, input.code),
        },
      ]);
    }
    await sendMessage(
      input.botToken,
      input.chatId,
      `This bot is already connected to ${await siteName(c, existing.siteId)}. Choose how to connect ${await siteName(c, pending.siteId)}:`,
      { inline_keyboard: buttons },
    );
    return;
  }

  // Fresh bind.
  await telegram.bindAccount({
    siteId: pending.siteId,
    botId: input.botId,
    telegramUserId: input.telegramUserId,
    telegramUsername: input.telegramUsername,
  });
  await sendMessage(
    input.botToken,
    input.chatId,
    `Connected to ${await siteName(c, pending.siteId)}. Send me any text and I'll post it as a note.`,
  );
}
