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

/**
 * One styled span within a Telegram message.
 *
 * `offset` and `length` are measured in UTF-16 code units, which matches
 * JavaScript string indexing — `text.slice(offset, offset + length)` returns
 * the entity's visible text directly. See
 * https://core.telegram.org/bots/api#messageentity for the full type list.
 */
export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  /** Present on `text_link` entities. */
  url?: string;
  /** Present on `pre` entities when the user picked a language. */
  language?: string;
}

/** One rendered size of a Telegram photo. */
export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

/** A Telegram video message attachment. */
export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  mime_type?: string;
  file_name?: string;
  file_size?: number;
  /** Auto-generated preview frame; downloadable as a normal PhotoSize. */
  thumbnail?: TelegramPhotoSize;
}

/** A Telegram document message attachment (arbitrary file). */
export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  mime_type?: string;
  file_name?: string;
  file_size?: number;
  /** Mime-appropriate preview, when one was generated. */
  thumbnail?: TelegramPhotoSize;
}

/** Subset of the Telegram `Message` object the integration consumes. */
export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
  entities?: TelegramMessageEntity[];
  /** Album grouping key — present on every item in a multi-attachment send. */
  media_group_id?: string;
  /** Caption supplied with a photo/video/document; same entity grammar as `text`. */
  caption?: string;
  caption_entities?: TelegramMessageEntity[];
  /** Ordered list of rendered sizes; the last entry is the highest resolution. */
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  document?: TelegramDocument;
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
 * Canonical bot command list. Telegram shows these in the `/` autocomplete
 * popup and on the bot's profile. The list is persisted per-bot on Telegram's
 * servers via `setMyCommands` — we only register commands the bot actually
 * responds to. Anything else the user sends is treated as note content.
 */
export const JANT_BOT_COMMANDS: ReadonlyArray<{
  command: string;
  description: string;
}> = [
  {
    command: "start",
    description: "Connect this chat to a Jant site",
  },
];

/**
 * Registers the bot's command list with Telegram so typing `/` in the chat
 * shows autocomplete suggestions. Idempotent — safe to call on every boot.
 *
 * @param token - Bot token
 * @param commands - Commands to register. Defaults to `JANT_BOT_COMMANDS`.
 */
export async function setMyCommands(
  token: string,
  commands: ReadonlyArray<{
    command: string;
    description: string;
  }> = JANT_BOT_COMMANDS,
): Promise<void> {
  await callTelegram(token, "setMyCommands", {
    commands: commands.map((c) => ({
      command: c.command,
      description: c.description,
    })),
  });
}

/**
 * Returns the bot's currently registered webhook URL (empty when none).
 *
 * Lets callers skip a redundant `setWebhook` write when the webhook is
 * already pointed at the right place.
 *
 * @param token - Bot token
 * @returns The current webhook URL, or `""` when no webhook is set
 */
export async function getWebhookUrl(token: string): Promise<string> {
  const result = await callTelegram<{ url?: string }>(token, "getWebhookInfo");
  return result.url ?? "";
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
 * Metadata returned by Telegram's `getFile`. The `file_path` is relative and
 * must be appended to `/file/bot<token>/` to download the bytes.
 */
export interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

/**
 * Resolves a `file_id` to its downloadable path and size.
 *
 * Telegram's Bot API supports downloads up to 20 MB; the caller is expected to
 * enforce its own limit using `file_size` before calling `downloadFile`.
 *
 * @param token - Bot token
 * @param fileId - Identifier from a photo/video/document field
 */
export async function getFile(
  token: string,
  fileId: string,
): Promise<TelegramFile> {
  return callTelegram<TelegramFile>(token, "getFile", { file_id: fileId });
}

/**
 * Downloads the raw bytes for a `file_path` returned by `getFile`.
 *
 * Returns the underlying `Response` so callers can stream large bodies into
 * storage without first materializing them in memory.
 *
 * @param token - Bot token
 * @param filePath - The `file_path` from `getFile`
 */
export async function downloadFile(
  token: string,
  filePath: string,
): Promise<Response> {
  const response = await fetch(
    `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`,
  );
  if (!response.ok) {
    throw new TelegramApiError(
      "downloadFile",
      `HTTP ${response.status} fetching ${filePath}`,
    );
  }
  return response;
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
