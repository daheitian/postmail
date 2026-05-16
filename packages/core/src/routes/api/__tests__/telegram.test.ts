import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestApp } from "../../../__tests__/helpers/app.js";
import { DEFAULT_TEST_SITE_ID } from "../../../__tests__/helpers/db.js";
import { telegramWebhookRoutes } from "../telegram.js";

const BOT_ID = "111111";
const BOT_TOKEN = `${BOT_ID}:AA-test-token`;
const SECRET = "test-webhook-secret";
const USER_ID = 999999;

/** Records every outbound Telegram API call so tests can assert on them. */
interface TelegramCall {
  method: string;
  body: Record<string, unknown>;
}

function mockTelegramFetch(): TelegramCall[] {
  const calls: TelegramCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: unknown }) => {
      const method = String(url).split("/").pop() ?? "";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ method, body });
      const result =
        method === "getMe"
          ? { id: Number(BOT_ID), username: "JantTestBot" }
          : true;
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

function setup() {
  const ctx = createTestApp({
    telegramBotTokens: BOT_TOKEN,
    telegramWebhookSecret: SECRET,
  });
  ctx.app.route("/api/telegram", telegramWebhookRoutes);
  return ctx;
}

function post(
  app: ReturnType<typeof setup>["app"],
  botId: string,
  secret: string | null,
  update: unknown,
) {
  return app.request(`/api/telegram/webhook/${botId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret === null ? {} : { "x-telegram-bot-api-secret-token": secret }),
    },
    body: JSON.stringify(update),
  });
}

function textUpdate(updateId: number, text: string) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      from: { id: USER_ID, is_bot: false, first_name: "Al", username: "al" },
      chat: { id: USER_ID },
      text,
    },
  };
}

function countPosts(sqlite: ReturnType<typeof setup>["sqlite"]): number {
  return (
    sqlite.prepare("SELECT COUNT(*) AS n FROM post").get() as { n: number }
  ).n;
}

describe("Telegram webhook route", () => {
  let calls: TelegramCall[];

  beforeEach(() => {
    calls = mockTelegramFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a request with a bad secret token", async () => {
    const { app } = setup();
    const res = await post(app, BOT_ID, "wrong-secret", textUpdate(1, "hi"));
    expect(res.status).toBe(401);
  });

  it("rejects a request for an unknown bot", async () => {
    const { app } = setup();
    const res = await post(app, "222222", SECRET, textUpdate(1, "hi"));
    expect(res.status).toBe(404);
  });

  it("publishes a note for a bound user's text message", async () => {
    const { app, services, sqlite } = setup();
    await services.telegram.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: String(USER_ID),
      telegramUsername: "al",
    });

    const res = await post(app, BOT_ID, SECRET, textUpdate(5, "hello world"));
    expect(res.status).toBe(200);
    expect(countPosts(sqlite)).toBe(1);
    expect(calls.some((c) => c.method === "sendMessage")).toBe(true);
  });

  it("folds telegram entities into markdown on the saved post body", async () => {
    const { app, services, sqlite } = setup();
    await services.telegram.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: String(USER_ID),
      telegramUsername: "al",
    });

    const res = await post(app, BOT_ID, SECRET, {
      update_id: 11,
      message: {
        message_id: 11,
        from: { id: USER_ID, is_bot: false, first_name: "Al", username: "al" },
        chat: { id: USER_ID },
        text: "hello bold world",
        entities: [{ type: "bold", offset: 6, length: 4 }],
      },
    });
    expect(res.status).toBe(200);
    // The post body is stored as the parsed ProseMirror JSON, so the
    // round-trip proof is that the word "bold" carries a `bold` mark — that
    // can only happen if entitiesToMarkdown emitted `**bold**` for the
    // markdown parser to pick up.
    const row = sqlite
      .prepare("SELECT body FROM post ORDER BY rowid DESC LIMIT 1")
      .get() as { body: string };
    const doc = JSON.parse(row.body) as {
      content: Array<{
        content: Array<{ text: string; marks?: Array<{ type: string }> }>;
      }>;
    };
    const spans = doc.content[0].content;
    expect(spans.find((s) => s.text === "bold")?.marks).toEqual([
      { type: "bold" },
    ]);
  });

  it("skips a duplicate update id", async () => {
    const { app, services, sqlite } = setup();
    await services.telegram.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: String(USER_ID),
      telegramUsername: "al",
    });

    await post(app, BOT_ID, SECRET, textUpdate(7, "first"));
    await post(app, BOT_ID, SECRET, textUpdate(7, "first again"));
    expect(countPosts(sqlite)).toBe(1);
  });

  it("declines a non-text message without posting", async () => {
    const { app, services, sqlite } = setup();
    await services.telegram.bindAccount({
      siteId: DEFAULT_TEST_SITE_ID,
      botId: BOT_ID,
      telegramUserId: String(USER_ID),
      telegramUsername: "al",
    });

    const res = await post(app, BOT_ID, SECRET, {
      update_id: 9,
      message: {
        message_id: 9,
        from: { id: USER_ID, is_bot: false, first_name: "Al" },
        chat: { id: USER_ID },
      },
    });
    expect(res.status).toBe(200);
    expect(countPosts(sqlite)).toBe(0);
  });

  it("prompts an unbound user instead of posting", async () => {
    const { app, sqlite } = setup();
    const res = await post(app, BOT_ID, SECRET, textUpdate(3, "stray message"));
    expect(res.status).toBe(200);
    expect(countPosts(sqlite)).toBe(0);
    expect(calls.some((c) => c.method === "sendMessage")).toBe(true);
  });

  it("binds an account via /start <code>", async () => {
    const { app, services } = setup();
    const code = await services.telegram.getOrCreateCode();

    const res = await post(
      app,
      BOT_ID,
      SECRET,
      textUpdate(2, `/start ${code}`),
    );
    expect(res.status).toBe(200);

    const binding = await services.telegram.findBindingByUser(
      BOT_ID,
      String(USER_ID),
    );
    expect(binding?.siteId).toBe(DEFAULT_TEST_SITE_ID);
  });

  it("binds an account when an unbound user sends just the bare code", async () => {
    const { app, services } = setup();
    const code = await services.telegram.getOrCreateCode();

    const res = await post(app, BOT_ID, SECRET, textUpdate(4, code));
    expect(res.status).toBe(200);

    const binding = await services.telegram.findBindingByUser(
      BOT_ID,
      String(USER_ID),
    );
    expect(binding?.siteId).toBe(DEFAULT_TEST_SITE_ID);
  });
});
