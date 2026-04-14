/**
 * GitHub Sync settings page
 *
 * Three states:
 * 1. Not configured — form to enter PAT + repo
 * 2. Connected — repo info, sync status, manual push, disconnect
 */

import { msg } from "@lingui/core/macro";
import { buildConfirmActionExpression } from "../../../lib/confirm.js";
import { formatDate, formatRelativeAge } from "../../../lib/time.js";
import { toPublicPath } from "../../../lib/url.js";
import { useLingui } from "../../../i18n/context.js";

export interface GitHubSyncStatus {
  enabled: boolean;
  repo: string | null;
  lastPushSha: string | null;
  webhookId: string | null;
  lastPushAt: number | null;
}

export function GitHubSyncContent({
  status,
  sitePathPrefix = "",
}: {
  status: GitHubSyncStatus;
  sitePathPrefix?: string;
}) {
  const settingsBase = toPublicPath("/settings/github-sync", sitePathPrefix);

  if (!status.enabled || !status.repo) {
    return <GitHubSyncSetupForm settingsBase={settingsBase} />;
  }

  return <GitHubSyncConnected status={status} settingsBase={settingsBase} />;
}

function GitHubSyncSetupForm({ settingsBase }: { settingsBase: string }) {
  const { i18n } = useLingui();

  return (
    <div class="flex flex-col gap-6 max-w-form">
      <div>
        <h2 class="text-lg font-medium mb-1">
          {i18n._(
            msg({
              message: "GitHub Sync",
              comment:
                "@context: Settings section heading for GitHub Sync setup",
            }),
          )}
        </h2>
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "Connect a GitHub repository to automatically back up your posts as Markdown files. Edits on GitHub sync back to your site.",
              comment:
                "@context: Intro text on GitHub Sync settings page when not connected",
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
          <label class="label" for="github-token">
            {i18n._(
              msg({
                message: "Personal Access Token",
                comment:
                  "@context: Label for GitHub PAT input on GitHub Sync settings",
              }),
            )}
          </label>
          <input
            id="github-token"
            data-bind="token"
            type="password"
            class="input"
            placeholder="github_pat_..."
            required
            autocomplete="off"
          />
          <p class="text-sm text-muted-foreground mt-1">
            {i18n._(
              msg({
                message:
                  "Create a fine-grained token with Contents (read/write) and Webhooks (read/write) permissions for your repository.",
                comment:
                  "@context: Help text for GitHub PAT input explaining required permissions",
              }),
            )}
          </p>
        </div>

        <div class="field">
          <label class="label" for="github-repo">
            {i18n._(
              msg({
                message: "Repository",
                comment:
                  "@context: Label for GitHub repository input on GitHub Sync settings",
              }),
            )}
          </label>
          <input
            id="github-repo"
            data-bind="repo"
            type="text"
            class="input"
            placeholder="owner/repo"
            required
            autocomplete="off"
          />
        </div>

        <div class="flex mt-2">
          <button type="submit" class="btn" data-attr:disabled="$_connecting">
            <Spinner signal="_connecting" />
            {i18n._(
              msg({
                message: "Connect",
                comment:
                  "@context: Button label to connect GitHub repository on GitHub Sync settings",
              }),
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Green circle SVG for connected status */
const STATUS_DOT = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="5" fill="currentColor"/></svg>`;

function Spinner({ signal }: { signal: string }) {
  return (
    <svg
      data-show={`$${signal}`}
      style="display:none"
      class="animate-spin size-4"
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

function GitHubSyncConnected({
  status,
  settingsBase,
}: {
  status: GitHubSyncStatus;
  settingsBase: string;
}) {
  const { i18n } = useLingui();
  const repoUrl = `https://github.com/${status.repo}`;

  const disconnectLabel = i18n._(
    msg({
      message: "Disconnect",
      comment:
        "@context: Button to disconnect GitHub repository on GitHub Sync settings",
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
      {/* Status card */}
      <div class="rounded-xl border border-border/70 bg-muted/30 p-5">
        <div class="flex flex-col gap-3">
          {/* Connected status header */}
          <div class="flex items-center gap-2 text-sm font-medium">
            <span
              class="text-green-600 dark:text-green-500"
              dangerouslySetInnerHTML={{ __html: STATUS_DOT }}
            />
            {i18n._(
              msg({
                message: "Connected",
                comment:
                  "@context: Status label when GitHub Sync is active and connected",
              }),
            )}
          </div>

          {/* Details */}
          <div class="flex flex-col gap-1.5 text-sm">
            {/* Repository */}
            <div class="flex items-baseline gap-2">
              <span class="text-muted-foreground">
                {i18n._(
                  msg({
                    message: "Repository",
                    comment:
                      "@context: Label for connected repository on GitHub Sync status",
                  }),
                )}
              </span>
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium hover:underline"
              >
                {status.repo}
              </a>
            </div>

            {/* Last synced */}
            <div class="flex items-baseline gap-2">
              <span class="text-muted-foreground">
                {i18n._(
                  msg({
                    message: "Last synced",
                    comment:
                      "@context: Label for last sync time on GitHub Sync status",
                  }),
                )}
              </span>
              <span
                class="font-medium"
                title={
                  status.lastPushAt ? formatDate(status.lastPushAt) : undefined
                }
              >
                {status.lastPushAt
                  ? formatRelativeAge(status.lastPushAt)
                  : i18n._(
                      msg({
                        message: "Not synced yet",
                        comment:
                          "@context: Shown when no sync has happened yet on GitHub Sync status",
                      }),
                    )}
              </span>
            </div>

            {/* Last commit */}
            {status.lastPushSha && (
              <div class="flex items-baseline gap-2">
                <span class="text-muted-foreground">
                  {i18n._(
                    msg({
                      message: "Last commit",
                      comment:
                        "@context: Label for last push commit SHA on GitHub Sync status",
                    }),
                  )}
                </span>
                <a
                  href={`${repoUrl}/commit/${status.lastPushSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-medium hover:underline"
                >
                  <code class="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {status.lastPushSha.slice(0, 7)}
                  </code>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Push section */}
      <section class="flex flex-col gap-3 border-t pt-8">
        <h3 class="text-sm font-semibold tracking-[0.01em]">
          {i18n._(
            msg({
              message: "Manual Push",
              comment:
                "@context: Section heading for manual push action on GitHub Sync settings",
            }),
          )}
        </h3>
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "Push all posts to GitHub right now instead of waiting for the next automatic sync.",
              comment:
                "@context: Description for manual push action on GitHub Sync settings",
            }),
          )}
        </p>
        <div class="flex mt-1">
          <button
            type="button"
            class="btn-outline"
            data-on:click__prevent={`@post('${settingsBase}/push')`}
            data-indicator="_pushing"
            data-attr:disabled="$_pushing"
          >
            <Spinner signal="_pushing" />
            {i18n._(
              msg({
                message: "Sync Now",
                comment:
                  "@context: Button to trigger a full content push to GitHub on GitHub Sync settings",
              }),
            )}
          </button>
        </div>
      </section>

      {/* Disconnect section */}
      <section class="flex flex-col gap-3 border-t pt-8">
        <h3 class="text-sm font-semibold tracking-[0.01em] text-destructive">
          {i18n._(
            msg({
              message: "Disconnect",
              comment:
                "@context: Section heading for disconnect action on GitHub Sync settings",
            }),
          )}
        </h3>
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "Remove the webhook and stop syncing. Your repository content will not be deleted.",
              comment:
                "@context: Description for disconnect action on GitHub Sync settings",
            }),
          )}
        </p>
        <div class="flex mt-1">
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
                      "Disconnect from GitHub? The webhook will be removed. Your repository content will not be deleted.",
                    comment:
                      "@context: Confirmation message when disconnecting GitHub Sync",
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
        </div>
      </section>
    </div>
  );
}
