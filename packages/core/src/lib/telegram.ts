/**
 * Telegram Bot API client.
 *
 * Thin `fetch` wrappers around the handful of Bot API methods the Telegram
 * integration needs, plus helpers for working with bot tokens and deep links.
 * All network calls go to `https://api.telegram.org/bot<token>/<method>`.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

/** A Telegram user as it appears in `message.from` / `callback_query.from`. */
export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

/** Subset of the Telegram `Message` object the integration consumes. */
export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
}

/** Subset of the Telegram `CallbackQuery` object the integration consumes. */
export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

/** Subset of the Telegram `Update` object delivered to the webhook. */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

/** An inline keyboard button — either a deep link or a callback action. */
export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

export class TelegramApiError extends Error {
  constructor(
    public readonly method: string,
    public readonly description: string,
  ) {
    super(`Telegram ${method} failed: ${description}`);
    this.name = "TelegramApiError";
  }
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

async function callTelegram<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const payload = (await response.json()) as TelegramApiResponse<T>;
  if (!payload.ok) {
    throw new TelegramApiError(method, payload.description ?? "unknown error");
  }
  return payload.result as T;
}

/**
 * Extracts the numeric bot id from a bot token.
 *
 * A Telegram token is `<bot_id>:<secret>`, so the bot id is intrinsic and
 * stable — no API call required.
 *
 * @param token - Full bot token
 * @returns The bot id, or an empty string when the token is malformed
 * @example
 * parseBotId("123456:ABC-DEF"); // "123456"
 */
export function parseBotId(token: string): string {
  const botId = token.split(":")[0]?.trim() ?? "";
  return /^\d+$/.test(botId) ? botId : "";
}

/**
 * Builds a `t.me` deep link that pre-fills `/start <code>` for a bot.
 *
 * @param botUsername - Bot username without the leading `@`
 * @param code - Binding code to pass as the `start` parameter
 * @returns The deep link URL
 * @example
 * buildDeepLink("JantBot", "abc123"); // "https://t.me/JantBot?start=abc123"
 */
export function buildDeepLink(botUsername: string, code: string): string {
  return `https://t.me/${botUsername}?start=${encodeURIComponent(code)}`;
}

/** Bot identity returned by `getMe`. */
export interface TelegramBotIdentity {
  id: number;
  username: string;
}

/**
 * Validates a bot token and returns the bot's identity.
 *
 * @param token - Bot token to validate
 * @returns The bot's numeric id and username
 * @throws {TelegramApiError} When the token is invalid
 */
export async function getMe(token: string): Promise<TelegramBotIdentity> {
  const result = await callTelegram<TelegramUser>(token, "getMe");
  return { id: result.id, username: result.username ?? "" };
}

/**
 * Registers a webhook URL for a bot.
 *
 * @param token - Bot token
 * @param url - Public webhook URL Telegram should POST updates to
 * @param secretToken - Value Telegram echoes back in the
 * `X-Telegram-Bot-Api-Secret-Token` header so the handler can verify the call
 */
export async function setWebhook(
  token: string,
  url: string,
  secretToken: string,
): Promise<void> {
  await callTelegram(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}

/**
 * Removes a bot's webhook.
 *
 * @param token - Bot token
 */
export async function deleteWebhook(token: string): Promise<void> {
  await callTelegram(token, "deleteWebhook");
}

/**
 * Sends a text message, optionally with an inline keyboard.
 *
 * @param token - Bot token
 * @param chatId - Target chat id
 * @param text - Message body
 * @param replyMarkup - Optional inline keyboard
 */
export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
): Promise<void> {
  await callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

/**
 * Acknowledges a callback query so Telegram stops showing a loading state on
 * the tapped inline button.
 *
 * @param token - Bot token
 * @param callbackQueryId - The callback query id to acknowledge
 */
export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
): Promise<void> {
  await callTelegram(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
  });
}
