/**
 * Telegram settings page
 *
 * States:
 * 1. Bring-your-own bot, no token saved — token input form
 * 2. Not connected, a bot is available — deep link + QR + binding code
 * 3. Connected — connected account, posting hint, disconnect
 *
 * In env-managed-pool deployments the token field is never shown: the bot
 * pool is platform-owned, so users only ever see the binding code flow.
 */

import { msg } from "@lingui/core/macro";
import { buildConfirmActionExpression } from "../../../lib/confirm.js";
import { escapeHtml } from "../../../lib/html.js";
import { toPublicPath } from "../../../lib/url.js";
import { useLingui } from "../../../i18n/context.js";

export interface TelegramSettingsView {
  /** True when `TELEGRAM_BOT_TOKENS` is set — the bot pool is platform-owned. */
  managed: boolean;
  /** Active binding for this site, or null. */
  binding: {
    telegramUsername: string | null;
    boundAt: number;
  } | null;
  /** Bring-your-own only: a bot token has been saved for this site. */
  userBotConfigured: boolean;
  /**
   * Connect affordances, present when nothing is connected yet and a bot is
   * available to connect through.
   */
  connect: {
    code: string;
    deepLink: string;
    /** QR-encoded `deepLink`, rendered SVG markup. */
    qrSvg: string;
    botUsername: string;
  } | null;
}

function Spinner({
  signal,
  size = "size-4",
}: {
  signal: string;
  size?: string;
}) {
  return (
    <svg
      data-show={`$${signal}`}
      style="display:none"
      class={`animate-spin ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="status"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const STATUS_DOT = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>`;

export function TelegramContent({
  view,
  sitePathPrefix = "",
  streamUrl,
}: {
  view: TelegramSettingsView;
  sitePathPrefix?: string;
  /**
   * When set and the page is in its "waiting for the user to bind" state,
   * mounts a Datastar SSE subscription so the panel auto-swaps to the
   * connected view the moment a binding lands. The patched-in connected
   * view has no `data-init`, so the stream closes naturally.
   */
  streamUrl?: string;
}) {
  const settingsBase = toPublicPath("/settings/telegram", sitePathPrefix);

  let inner;
  if (view.binding) {
    inner = <TelegramConnected view={view} settingsBase={settingsBase} />;
  } else if (!view.managed && !view.userBotConfigured) {
    inner = <TelegramSetupForm settingsBase={settingsBase} />;
  } else {
    inner = <TelegramConnect view={view} settingsBase={settingsBase} />;
  }

  // Only the "ready to connect" state subscribes — that's the only time
  // we're actively waiting for an external event (the user messaging the
  // bot). Connected and setup-form states have nothing to poll for.
  const subscribe = !view.binding && view.connect && streamUrl;

  return (
    <div
      id="telegram-status"
      data-init={subscribe ? `@get('${streamUrl}')` : undefined}
    >
      {inner}
    </div>
  );
}

function TelegramSetupForm({ settingsBase }: { settingsBase: string }) {
  const { i18n } = useLingui();
  return (
    <div class="flex flex-col gap-6 max-w-form">
      <div>
        <h2 class="text-lg font-medium mb-1">
          {i18n._(
            msg({
              message: "Telegram",
              comment: "@context: Settings section heading for Telegram setup",
            }),
          )}
        </h2>
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "Connect a Telegram bot, then anything you message it gets published as a note.",
              comment:
                "@context: Intro text on the Telegram settings page when no bot is set up",
            }),
          )}
        </p>
      </div>

      <form
        class="flex flex-col gap-4"
        data-on:submit__prevent={`@post('${settingsBase}/connect')`}
        data-indicator="_connecting"
      >
        <div class="field">
          <label class="label" for="telegram-token">
            {i18n._(
              msg({
                message: "Bot token",
                comment: "@context: Label for the Telegram bot token input",
              }),
            )}
          </label>
          <input
            id="telegram-token"
            data-bind="token"
            type="password"
            class="input"
            placeholder="123456789:ABC..."
            required
            autocomplete="off"
          />
          <p class="text-sm text-muted-foreground mt-1">
            {i18n._(
              msg({
                message:
                  "Create a bot by messaging @BotFather on Telegram, then paste the token it gives you.",
                comment:
                  "@context: Help text explaining where to get a Telegram bot token",
              }),
            )}
          </p>
        </div>
        <div class="flex mt-2">
          <button type="submit" class="btn" data-attr:disabled="$_connecting">
            <Spinner signal="_connecting" />
            {i18n._(
              msg({
                message: "Save bot token",
                comment: "@context: Button to save the Telegram bot token",
              }),
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function TelegramConnect({
  view,
  settingsBase,
}: {
  view: TelegramSettingsView;
  settingsBase: string;
}) {
  const { i18n } = useLingui();
  const connect = view.connect;

  if (!connect) {
    return (
      <div class="flex flex-col gap-4 max-w-form">
        <div class="alert">
          <span>
            {i18n._(
              msg({
                message:
                  "Telegram is set up, but the bot couldn't be reached. Check the bot token and try again.",
                comment:
                  "@context: Error shown on the Telegram settings page when the bot can't be reached",
              }),
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-6 max-w-form">
      <div>
        <h2 class="text-lg font-medium mb-1">
          {i18n._(
            msg({
              message: "Connect Telegram",
              comment:
                "@context: Heading on the Telegram settings page when ready to connect",
            }),
          )}
        </h2>
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "Open the bot and send the binding code, then anything you message it becomes a note.",
              comment:
                "@context: Instructions on the Telegram settings page for connecting an account",
            }),
          )}
        </p>
      </div>

      <div
        class="flex flex-col items-center gap-4 py-2"
        data-signals="{_codeCopied: false}"
      >
        {/*
         * Mobile: deep-link button is the only sensible affordance — you
         * can't scan your own screen. QR is hidden on small viewports.
         * Desktop: QR leads; the @bot username in the caption below is a
         * t.me link so power users on Telegram Desktop can still jump
         * straight in.
         */}
        <a
          href={connect.deepLink}
          target="_blank"
          rel="noopener noreferrer"
          class="btn sm:hidden"
        >
          {i18n._(
            msg({
              message: "Open Telegram to connect",
              comment:
                "@context: Button that opens the Telegram bot via a deep link",
            }),
          )}
        </a>
        <div
          class="hidden sm:block bg-white p-3 rounded-lg shadow-sm"
          style="width:180px;height:180px"
          aria-label={i18n._(
            msg({
              message: "QR code linking to the Telegram bot",
              comment:
                "@context: Accessible label for the Telegram connect QR code",
            }),
          )}
          dangerouslySetInnerHTML={{ __html: connect.qrSvg }}
        />

        <p
          class="text-sm text-muted-foreground text-center"
          dangerouslySetInnerHTML={{
            __html: i18n._(
              msg({
                message: "Or message {linkOpen}@{botUsername}{linkClose} with:",
                comment:
                  "@context: Caption above the manual Telegram binding code. {linkOpen}/{linkClose} wrap the bot username as a t.me link — keep them around the @username token in translations.",
              }),
              {
                botUsername: escapeHtml(connect.botUsername),
                linkOpen: `<a href="${escapeHtml(`https://t.me/${connect.botUsername}`)}" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 hover:text-foreground">`,
                linkClose: "</a>",
              },
            ),
          }}
        />
        <div class="flex items-center gap-2">
          <code class="text-sm bg-muted px-3 py-1.5 rounded font-mono select-all">
            /start {connect.code}
          </code>
          <button
            type="button"
            class="btn-sm-outline shrink-0"
            aria-label={i18n._(
              msg({
                message: "Copy",
                comment: "@context: Button to copy the Telegram binding code",
              }),
            )}
            data-on:click={`navigator.clipboard.writeText('/start ${connect.code}'); $_codeCopied = true`}
            data-text={`$_codeCopied ? '${i18n._(
              msg({
                message: "Copied",
                comment: "@context: Feedback after copying to clipboard",
              }),
            )}' : '${i18n._(
              msg({
                message: "Copy",
                comment: "@context: Button to copy the Telegram binding code",
              }),
            )}'`}
          >
            {i18n._(
              msg({
                message: "Copy",
                comment: "@context: Button to copy the Telegram binding code",
              }),
            )}
          </button>
        </div>

        <button
          type="button"
          class="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-dotted inline-flex items-center gap-1.5"
          data-on:click__prevent={`@post('${settingsBase}/regenerate-code')`}
          data-indicator="_regenerating"
          data-attr:disabled="$_regenerating"
        >
          <Spinner signal="_regenerating" size="size-3" />
          {i18n._(
            msg({
              message: "Get a new code",
              comment:
                "@context: Button to regenerate the Telegram binding code",
            }),
          )}
        </button>
      </div>

      {!view.managed ? (
        <div class="flex justify-center pt-2">
          <RemoveBotLink settingsBase={settingsBase} />
        </div>
      ) : null}
    </div>
  );
}

function TelegramConnected({
  view,
  settingsBase,
}: {
  view: TelegramSettingsView;
  settingsBase: string;
}) {
  const { i18n } = useLingui();
  const account = view.binding?.telegramUsername
    ? `@${view.binding.telegramUsername}`
    : i18n._(
        msg({
          message: "your Telegram account",
          comment:
            "@context: Fallback name when a connected Telegram account has no username",
        }),
      );
  const disconnectLabel = i18n._(
    msg({
      message: "Disconnect",
      comment: "@context: Button to disconnect Telegram",
    }),
  );
  const cancelLabel = i18n._(
    msg({
      message: "Cancel",
      comment: "@context: Button label to dismiss a dialog or action",
    }),
  );

  return (
    <div class="flex flex-col gap-8 max-w-form">
      <div>
        <h2 class="text-lg font-medium mb-1">
          {i18n._(
            msg({
              message: "Telegram",
              comment: "@context: Settings section heading for Telegram setup",
            }),
          )}
        </h2>
        <div class="flex items-center gap-2 text-sm">
          <span
            class="text-green-600 dark:text-green-500"
            dangerouslySetInnerHTML={{ __html: STATUS_DOT }}
          />
          <span>
            {i18n._(
              msg({
                message: "Connected as {account}",
                comment:
                  "@context: Status label when Telegram is connected, with the account name",
              }),
              { account },
            )}
          </span>
        </div>
        <p class="text-sm text-muted-foreground mt-2">
          {i18n._(
            msg({
              message: "Message the bot any text and it's published as a note.",
              comment: "@context: Hint shown when Telegram is connected",
            }),
          )}
        </p>
      </div>

      <section class="flex flex-col gap-3 border-t pt-8">
        <h3 class="text-sm font-semibold tracking-[0.01em] text-destructive">
          {disconnectLabel}
        </h3>
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "Stop accepting posts from Telegram. Your existing notes stay published.",
              comment:
                "@context: Description for the Telegram disconnect action",
            }),
          )}
        </p>
        <div class="flex flex-wrap items-center gap-4 mt-1">
          <button
            type="button"
            class="btn-ghost text-destructive"
            data-indicator="_disconnecting"
            data-attr:disabled="$_disconnecting"
            data-on:click__prevent={buildConfirmActionExpression(
              `@post('${settingsBase}/disconnect')`,
              {
                message: i18n._(
                  msg({
                    message:
                      "Disconnect Telegram? You can reconnect any time with a new binding code.",
                    comment:
                      "@context: Confirmation message when disconnecting Telegram",
                  }),
                ),
                confirmLabel: disconnectLabel,
                cancelLabel,
                tone: "danger",
              },
            )}
          >
            <Spinner signal="_disconnecting" />
            {disconnectLabel}
          </button>
          {!view.managed ? <RemoveBotLink settingsBase={settingsBase} /> : null}
        </div>
      </section>
    </div>
  );
}

function RemoveBotLink({ settingsBase }: { settingsBase: string }) {
  const { i18n } = useLingui();
  const removeLabel = i18n._(
    msg({
      message: "Remove bot",
      comment: "@context: Button to remove the saved Telegram bot token",
    }),
  );
  const cancelLabel = i18n._(
    msg({
      message: "Cancel",
      comment: "@context: Button label to dismiss a dialog or action",
    }),
  );

  return (
    <button
      type="button"
      class="text-xs text-muted-foreground hover:text-destructive underline underline-offset-4 decoration-dotted inline-flex items-center gap-1.5"
      data-indicator="_removing"
      data-attr:disabled="$_removing"
      data-on:click__prevent={buildConfirmActionExpression(
        `@post('${settingsBase}/remove-bot')`,
        {
          message: i18n._(
            msg({
              message:
                "Remove the saved bot token? Its webhook is deleted and any connected account is disconnected.",
              comment:
                "@context: Confirmation message when removing the Telegram bot token",
            }),
          ),
          confirmLabel: removeLabel,
          cancelLabel,
          tone: "danger",
        },
      )}
    >
      <Spinner signal="_removing" size="size-3" />
      {removeLabel}
    </button>
  );
}
