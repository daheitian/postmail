import { getJantCloudBaseUrl, getSiteResolutionMode } from "./env.js";

function getHostedAdminContinuationPath(publicRequestUrl: string): string {
  const currentHost = new URL(publicRequestUrl).host;
  return `/auth/handoff/start?host=${encodeURIComponent(currentHost)}&redirect=${encodeURIComponent("/settings")}`;
}

export function getHostedCloudSigninUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  const cloudBaseUrl = getJantCloudBaseUrl(env);
  if (!cloudBaseUrl || getSiteResolutionMode(env) !== "host-based") {
    return null;
  }

  const location = new URL(cloudBaseUrl);
  location.pathname = "/auth/handoff/start";
  location.search = getHostedAdminContinuationPath(publicRequestUrl).replace(
    /^\/auth\/handoff\/start/,
    "",
  );
  return location.toString();
}

export function getHostedCloudResetUrl(
  env: object | undefined | null,
  publicRequestUrl: string,
): string | null {
  const cloudBaseUrl = getJantCloudBaseUrl(env);
  if (!cloudBaseUrl || getSiteResolutionMode(env) !== "host-based") {
    return null;
  }

  const location = new URL(cloudBaseUrl);
  location.pathname = "/reset";
  location.searchParams.set(
    "next",
    getHostedAdminContinuationPath(publicRequestUrl),
  );
  return location.toString();
}
