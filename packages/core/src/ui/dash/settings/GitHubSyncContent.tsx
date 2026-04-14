/**
 * GitHub Sync settings page
 *
 * Three states:
 * 1. Not configured — form to enter PAT + repo
 * 2. Connected — repo info + "Push Full Sync" + "Disconnect"
 * 3. Error — shows last error
 */

import { msg } from "@lingui/core/macro";
import { useLingui } from "../../../i18n/context.js";
import { toPublicPath } from "../../../lib/url.js";

export interface GitHubSyncStatus {
  enabled: boolean;
  repo: string | null;
  lastPushSha: string | null;
  webhookId: string | null;
}

export function GitHubSyncContent({
  status,
  sitePathPrefix = "",
}: {
  status: GitHubSyncStatus;
  sitePathPrefix?: string;
}) {
  const { i18n } = useLingui();
  const apiBase = toPublicPath("/api/github-sync", sitePathPrefix);

  if (!status.enabled || !status.repo) {
    return <GitHubSyncSetupForm apiBase={apiBase} />;
  }

  return <GitHubSyncConnected status={status} apiBase={apiBase} />;
}

function GitHubSyncSetupForm({ apiBase }: { apiBase: string }) {
  const { i18n } = useLingui();

  return (
    <div class="settings-form-section">
      <div class="settings-form-intro">
        <p>
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
        class="settings-form"
        data-on:submit__prevent={`
          $$el = $el;
          @post('${apiBase}/setup', {
            body: JSON.stringify({
              token: $$el.querySelector('[name=token]').value,
              repo: $$el.querySelector('[name=repo]').value,
            }),
            headers: { 'Content-Type': 'application/json' },
          })
        `}
      >
        <div class="field">
          <label class="field-label" for="github-token">
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
            name="token"
            type="password"
            class="input"
            placeholder="github_pat_..."
            required
            autocomplete="off"
          />
          <p class="field-description">
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
          <label class="field-label" for="github-repo">
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
            name="repo"
            type="text"
            class="input"
            placeholder="owner/repo"
            required
            autocomplete="off"
          />
        </div>

        <div class="settings-form-actions">
          <button type="submit" class="btn btn-primary">
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

function GitHubSyncConnected({
  status,
  apiBase,
}: {
  status: GitHubSyncStatus;
  apiBase: string;
}) {
  const { i18n } = useLingui();
  const repoUrl = `https://github.com/${status.repo}`;

  return (
    <div class="settings-form-section">
      <div class="settings-form-intro">
        <dl class="settings-kv">
          <dt>
            {i18n._(
              msg({
                message: "Repository",
                comment:
                  "@context: Label for connected repository on GitHub Sync status",
              }),
            )}
          </dt>
          <dd>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">
              {status.repo}
            </a>
          </dd>

          {status.lastPushSha && (
            <>
              <dt>
                {i18n._(
                  msg({
                    message: "Last Push",
                    comment:
                      "@context: Label for last push commit SHA on GitHub Sync status",
                  }),
                )}
              </dt>
              <dd>
                <a
                  href={`${repoUrl}/commit/${status.lastPushSha}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <code>{status.lastPushSha.slice(0, 7)}</code>
                </a>
              </dd>
            </>
          )}
        </dl>
      </div>

      <div class="settings-form-actions">
        <button
          type="button"
          class="btn btn-primary"
          data-on:click__prevent={`@post('${apiBase}/push', { headers: { 'Content-Type': 'application/json' } })`}
        >
          {i18n._(
            msg({
              message: "Push Full Sync",
              comment:
                "@context: Button to trigger a full content push to GitHub on GitHub Sync settings",
            }),
          )}
        </button>

        <button
          type="button"
          class="btn btn-outline"
          data-on:click__prevent={`
            if (confirm('${i18n._(
              msg({
                message:
                  "Disconnect from GitHub? The webhook will be removed. Your repository content will not be deleted.",
                comment:
                  "@context: Confirmation message when disconnecting GitHub Sync",
              }),
            )}')) {
              @delete('${apiBase}', { headers: { 'Content-Type': 'application/json' } })
            }
          `}
        >
          {i18n._(
            msg({
              message: "Disconnect",
              comment:
                "@context: Button to disconnect GitHub repository on GitHub Sync settings",
            }),
          )}
        </button>
      </div>
    </div>
  );
}
