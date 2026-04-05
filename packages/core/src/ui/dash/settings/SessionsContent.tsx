/**
 * Session management: view active sessions and revoke them
 */

import { msg } from "@lingui/core/macro";
import { useLingui } from "../../../i18n/context.js";
import { buildConfirmActionExpression } from "../../../lib/confirm.js";
import { formatDate } from "../../../lib/time.js";
import { toPublicPath } from "../../../lib/url.js";

export interface SessionInfo {
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: number;
  isCurrent: boolean;
}

/**
 * Parse a user-agent string into a human-readable device description.
 *
 * @param ua - Raw User-Agent header value
 * @returns Short description like "Chrome on macOS" or "Safari on iPhone"
 *
 * @example
 * ```ts
 * parseDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... Chrome/120")
 * // "Chrome on macOS"
 * ```
 */
function parseDevice(ua: string | null): string | null {
  if (!ua) return null;

  let browser = "Unknown browser";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera/")) browser = "Opera";
  else if (ua.includes("Chrome/") && ua.includes("Safari/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/"))
    browser = "Safari";
  else if (ua.includes("curl/")) browser = "curl";

  let os = "";
  if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("CrOS")) os = "ChromeOS";

  return os ? `${browser} on ${os}` : browser;
}

/** Monitor icon for desktop sessions */
const ICON_DESKTOP = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>`;

/** Smartphone icon for mobile sessions */
const ICON_MOBILE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`;

function isMobileUA(ua: string | null): boolean {
  if (!ua) return false;
  return /iPhone|iPad|iPod|Android|Mobile/i.test(ua);
}

function SessionRow({
  session,
  sitePathPrefix = "",
}: {
  session: SessionInfo;
  sitePathPrefix?: string;
}) {
  const { i18n } = useLingui();
  const device = parseDevice(session.userAgent);
  const icon = isMobileUA(session.userAgent) ? ICON_MOBILE : ICON_DESKTOP;
  const revokeLabel = i18n._(
    msg({
      message: "Revoke",
      comment: "@context: Button to revoke a session",
    }),
  );

  return (
    <div class="py-4 flex items-start gap-4 border-b border-border last:border-b-0">
      <span
        class="text-muted-foreground mt-0.5 shrink-0"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <div class="flex-1 min-w-0">
        <div class="font-medium flex items-center gap-2">
          {device ??
            i18n._(
              msg({
                message: "Unknown device",
                comment:
                  "@context: Fallback label when session device can't be identified",
              }),
            )}
          {session.isCurrent && (
            <span class="badge text-xs">
              {i18n._(
                msg({
                  message: "Current",
                  comment:
                    "@context: Badge indicating the current active session",
                }),
              )}
            </span>
          )}
        </div>
        <div class="text-sm text-muted-foreground mt-0.5">
          {session.ipAddress && (
            <>
              <span>{session.ipAddress}</span>
              <span class="mx-2">&middot;</span>
            </>
          )}
          {i18n._(
            msg({
              message: "Signed in {date}",
              comment: "@context: Session creation date",
            }),
            {
              date: formatDate(session.createdAt),
            },
          )}
        </div>
      </div>
      {!session.isCurrent && (
        <button
          type="button"
          class="btn-sm-ghost text-destructive"
          data-on:click__prevent={buildConfirmActionExpression(
            `@post('${toPublicPath(`/settings/account/sessions/${session.token}/revoke`, sitePathPrefix)}')`,
            {
              message: i18n._(
                msg({
                  message:
                    "Revoke this session? That device will need to sign in again.",
                  comment:
                    "@context: Confirm dialog for revoking an active session",
                }),
              ),
              confirmLabel: revokeLabel,
              cancelLabel: i18n._(
                msg({
                  message: "Cancel",
                  comment:
                    "@context: Button label to dismiss a dialog or action",
                }),
              ),
              tone: "danger",
            },
          )}
        >
          {revokeLabel}
        </button>
      )}
    </div>
  );
}

export function SessionsContent({
  sessions,
  sitePathPrefix = "",
}: {
  sessions: SessionInfo[];
  sitePathPrefix?: string;
}) {
  const { i18n } = useLingui();

  return (
    <div class="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 class="text-lg font-medium mb-1">
          {i18n._(
            msg({
              message: "Active Sessions",
              comment: "@context: Settings section heading for active sessions",
            }),
          )}
        </h2>
        <p class="text-sm text-muted-foreground mb-4">
          {i18n._(
            msg({
              message:
                "These devices are currently signed in to your account. Revoke any session you don't recognize.",
              comment: "@context: Description for session management",
            }),
          )}
        </p>
      </div>

      {sessions.length > 0 ? (
        <div class="border border-border rounded-lg px-4">
          {sessions.map((session) => (
            <SessionRow
              key={session.token}
              session={session}
              sitePathPrefix={sitePathPrefix}
            />
          ))}
        </div>
      ) : (
        <p class="text-sm text-muted-foreground">
          {i18n._(
            msg({
              message:
                "No active sessions right now. Signed-in devices show up here.",
              comment:
                "@context: Empty state when no sessions exist (shouldn't normally appear)",
            }),
          )}
        </p>
      )}
    </div>
  );
}
