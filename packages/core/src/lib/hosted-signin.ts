import {
  getHostedAuthBaseUrl,
  getHostedAuthProviderLabel as getConfiguredHostedAuthProviderLabel,
  getSiteResolutionMode,
} from "./env.js";

function getHostedAdminContinuationPath(publicRequestUrl: string): string {
  const currentHost = new URL(publicRequestUrl).host;
  return `/auth/handoff/start?host=${encodeURIComponent(currentHost)}&redirect=${encodeURIComponent("/settings")}`;
}

function buildHostedAuthUrl(
  env: object | undefined | null,
  pathname: string,
  search?: string,
): string | null {
  const hostedAuthBaseUrl = getHostedAuthBaseUrl(env);
  if (!hostedAuthBaseUrl || getSiteResolutionMode(env) !== "host-based") {
    return null;
  }

  const location = new URL(hostedAuthBaseUrl);
  location.pathname = pathname;
  location.search = search ?? "";
  return location.toString();
}

export function getHostedAuthSigninUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  return buildHostedAuthUrl(
    env,
    "/auth/handoff/start",
    getHostedAdminContinuationPath(publicRequestUrl).replace(
      /^\/auth\/handoff\/start/,
      "",
    ),
  );
}

export function getHostedAuthResetUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  const search = new URLSearchParams();
  search.set("next", getHostedAdminContinuationPath(publicRequestUrl));
  return buildHostedAuthUrl(env, "/reset", `?${search.toString()}`);
}

export function getHostedAuthDashboardUrl(
  env: object | undefined | null,
): string | null {
  return buildHostedAuthUrl(env, "/sites");
}

export function getHostedAuthAccountUrl(
  env: object | undefined | null,
): string | null {
  return buildHostedAuthUrl(env, "/settings/account");
}

export function getHostedAuthAccountPasswordUrl(
  env: object | undefined | null,
): string | null {
  return buildHostedAuthUrl(env, "/settings/account/password");
}

export function getHostedAuthProviderLabel(
  env: object | undefined | null,
): string | null {
  return getConfiguredHostedAuthProviderLabel(env) ?? null;
}

export function isHostedAuthEnabled(env: object | undefined | null): boolean {
  return (
    getSiteResolutionMode(env) === "host-based" &&
    Boolean(getHostedAuthBaseUrl(env))
  );
}
