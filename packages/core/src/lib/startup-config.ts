import { escapeHtml } from "./html.js";
import { getAuthSecret } from "./env.js";
import type { Bindings } from "../types.js";

function renderConfigurationErrorPage(input: {
  title: string;
  bodyHtml: string;
  docsHref: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Configuration Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#fafafa;color:#111;padding:24px}div{max-width:560px;text-align:left;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.04)}h1{font-size:1.25rem;font-weight:600;margin:0 0 12px}p{color:#4a4a4a;line-height:1.6;margin:12px 0}code{background:#f1f1f1;padding:2px 6px;border-radius:4px;font-size:.9em}a{color:#0f766e;text-decoration:none}a:hover{text-decoration:underline}</style>
</head>
<body>
<div>
<h1>${input.title}</h1>
${input.bodyHtml}
<p><a href="${input.docsHref}" target="_blank" rel="noopener noreferrer">Open configuration instructions</a></p>
</div>
</body>
</html>`;
}

function getAuthSecretErrorHtml(): string {
  const runtimeInstructions = `<p>Set <code>AUTH_SECRET=...</code> in the environment used to start Jant.</p>
<p><strong>Cloudflare Workers:</strong> add <code>AUTH_SECRET</code> as a Worker secret in the dashboard under Variables and Secrets, or run <code>wrangler secret put AUTH_SECRET</code>.</p>`;

  return renderConfigurationErrorPage({
    title: "AUTH_SECRET is not set",
    bodyHtml: `<p>Jant needs a 32+ character auth secret to sign sessions.</p>${runtimeInstructions}`,
    docsHref:
      "https://github.com/jant-me/jant/blob/main/docs/configuration.md#required",
  });
}

export function getRuntimeConfigurationErrorPage(message: string): string {
  return renderConfigurationErrorPage({
    title: "Configuration Error",
    bodyHtml: `<p>${escapeHtml(message)}</p><p>Update your environment or instance data, then restart Jant.</p>`,
    docsHref:
      "https://github.com/jant-me/jant/blob/main/docs/configuration.md#site-resolution",
  });
}

/**
 * Returns the startup configuration error page for invalid required env vars.
 *
 * @param env - Worker bindings available at startup
 * @returns HTML for a blocking startup configuration error, or `null` when config is valid
 *
 * @example
 * ```ts
 * getStartupConfigurationErrorPage({ AUTH_SECRET: "secret" }) // null
 * ```
 */
export function getStartupConfigurationErrorPage(
  env: Pick<
    Bindings,
    | "AUTH_SECRET"
    | "DEV_API_TOKEN"
    | "NODE_DATABASE"
    | "NODE_SQLITE"
    | "DATABASE_URL"
    | "DATA_DIR"
  >,
): string | null {
  if (!getAuthSecret(env)) {
    return getAuthSecretErrorHtml();
  }

  return null;
}
