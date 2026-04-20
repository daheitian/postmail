import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";
import { resolveDemoPublicSiteUrl } from "./lib/runtime.mjs";

function toSiteScopedUrl(siteUrl, path) {
  const url = new URL(siteUrl);
  const basePath = url.pathname.replace(/\/$/, "");
  url.pathname = `${basePath}${path}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function getGuidance(siteUrl) {
  return [
    `The deployed demo-public Worker at ${siteUrl} does not expose the internal API token admin route yet.`,
    "Deploy the latest demo-public Worker code and make sure INTERNAL_ADMIN_TOKEN is set as a Worker secret.",
    "Run: mise run deploy-demo",
  ].join("\n");
}

function formatFailure(status, bodyText) {
  if (!bodyText) {
    return `HTTP ${status}`;
  }

  try {
    const parsed = JSON.parse(bodyText);
    return `HTTP ${status}: ${parsed.error ?? bodyText}`;
  } catch {
    return `HTTP ${status}: ${bodyText}`;
  }
}

loadDemoWorkflowEnv({ sites: ["demo"] });

const siteUrl = resolveDemoPublicSiteUrl();
const internalAdminToken = process.env.INTERNAL_ADMIN_TOKEN;
const checkOnly = process.argv.includes("--check");

if (!internalAdminToken) {
  console.error(
    [
      "INTERNAL_ADMIN_TOKEN is required for demo-public maintenance.",
      "Set it in sites/demo/.env.local for local scripts and as a Worker secret on demo-public.",
      "Example: wrangler secret put INTERNAL_ADMIN_TOKEN",
    ].join("\n"),
  );
  process.exit(1);
}

const endpoint = toSiteScopedUrl(
  siteUrl,
  checkOnly
    ? "/api/internal/api-tokens/health"
    : "/api/internal/api-tokens/purge",
);
const response = await fetch(endpoint, {
  method: checkOnly ? "GET" : "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${internalAdminToken}`,
  },
});

const bodyText = await response.text();
if (!response.ok) {
  if (response.status === 404) {
    throw new Error(getGuidance(siteUrl));
  }
  throw new Error(
    `Failed to clear demo-public API tokens via ${endpoint}: ${formatFailure(response.status, bodyText)}`,
  );
}

const body = JSON.parse(bodyText);
if (checkOnly) {
  console.log("demo-public internal admin endpoint is reachable.");
  process.exit(0);
}

console.log(`Deleted ${body.deleted ?? 0} demo-public API token(s).`);
