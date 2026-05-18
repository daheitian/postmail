import { describe, it, expect, afterEach, vi } from "vitest";
import { registerTelegramPoolWebhooks } from "../telegram-pool-webhooks.js";

const BOT_ID = "111111";
const TOKEN = `${BOT_ID}:AA-test-token`;
const BASE_URL = "https://cloud.example";
const SECRET = "shared-webhook-secret";
const EXPECTED_URL = `${BASE_URL}/api/telegram/webhook/${BOT_ID}`;

interface Call {
  method: string;
  body: Record<string, unknown>;
}

/** Mocks the Telegram API; `currentWebhookUrl` is what getWebhookInfo reports. */
function mockFetch(currentWebhookUrl: string): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: unknown }) => {
      const method = String(url).split("/").pop() ?? "";
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      calls.push({ method, body });
      const result =
        method === "getWebhookInfo" ? { url: currentWebhookUrl } : true;
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

describe("registerTelegramPoolWebhooks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does nothing when no pool is configured", async () => {
    const calls = mockFetch("");
    await registerTelegramPoolWebhooks({});
    expect(calls).toHaveLength(0);
  });

  it("does nothing when not a hosted deployment", async () => {
    const calls = mockFetch("");
    await registerTelegramPoolWebhooks({
      TELEGRAM_BOT_TOKENS: TOKEN,
      TELEGRAM_WEBHOOK_SECRET: SECRET,
    });
    expect(calls).toHaveLength(0);
  });

  it("skips registration when the shared secret is missing", async () => {
    const calls = mockFetch("");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await registerTelegramPoolWebhooks({
      TELEGRAM_BOT_TOKENS: TOKEN,
      HOSTED_CONTROL_PLANE_BASE_URL: BASE_URL,
    });
    expect(calls).toHaveLength(0);
  });

  it("registers a webhook that is not yet set", async () => {
    const calls = mockFetch("");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await registerTelegramPoolWebhooks({
      TELEGRAM_BOT_TOKENS: TOKEN,
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      HOSTED_CONTROL_PLANE_BASE_URL: BASE_URL,
    });
    expect(calls.map((c) => c.method)).toEqual([
      "getWebhookInfo",
      "setWebhook",
      "setMyCommands",
    ]);
    expect(calls[1]?.body).toMatchObject({
      url: EXPECTED_URL,
      secret_token: SECRET,
    });
  });

  it("skips setWebhook when already pointed at the right URL but still syncs commands", async () => {
    const calls = mockFetch(EXPECTED_URL);
    await registerTelegramPoolWebhooks({
      TELEGRAM_BOT_TOKENS: TOKEN,
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      HOSTED_CONTROL_PLANE_BASE_URL: BASE_URL,
    });
    expect(calls.map((c) => c.method)).toEqual([
      "getWebhookInfo",
      "setMyCommands",
    ]);
  });

  it("re-registers when the webhook points elsewhere", async () => {
    const calls = mockFetch(
      "https://stale.example/api/telegram/webhook/111111",
    );
    vi.spyOn(console, "log").mockImplementation(() => {});
    await registerTelegramPoolWebhooks({
      TELEGRAM_BOT_TOKENS: TOKEN,
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      HOSTED_CONTROL_PLANE_BASE_URL: BASE_URL,
    });
    expect(calls.map((c) => c.method)).toEqual([
      "getWebhookInfo",
      "setWebhook",
      "setMyCommands",
    ]);
  });

  it("registers /start in the command list so Telegram autocomplete works", async () => {
    const calls = mockFetch("");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await registerTelegramPoolWebhooks({
      TELEGRAM_BOT_TOKENS: TOKEN,
      TELEGRAM_WEBHOOK_SECRET: SECRET,
      HOSTED_CONTROL_PLANE_BASE_URL: BASE_URL,
    });
    const setCommands = calls.find((c) => c.method === "setMyCommands");
    expect(setCommands?.body).toMatchObject({
      commands: [{ command: "start" }],
    });
  });
});
