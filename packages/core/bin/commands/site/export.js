import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { openNodeSqlite } from "../../lib/node-sqlite.js";
import { loadNodeRuntime } from "../../lib/load-node-runtime.js";

function getSiteUrl(env = process.env) {
  return env.JANT_SITE_URL || env.SITE_URL || "http://localhost";
}

function getPublicUrl(provider, appConfig) {
  if (provider === "s3") return appConfig.s3PublicUrl;
  if (provider === "local") return appConfig.localPublicUrl;
  return appConfig.r2PublicUrl;
}

function getMediaPublicUrl(storageKey, provider, appConfig) {
  const base = getPublicUrl(provider, appConfig);
  if (base) {
    return `${base.replace(/\/+$/, "")}/${storageKey}`;
  }

  const prefix = appConfig.sitePathPrefix || "";
  return `${prefix}/${storageKey}`.replace(/\/{2,}/g, "/");
}

async function exportRemoteSite(url, token) {
  const response = await fetch(`${url.replace(/\/$/, "")}/api/export/zola`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

async function exportLocalSite(env = process.env) {
  const { sqlite } = openNodeSqlite(env, { readonly: true });

  try {
    const {
      createExportService,
      createNodeCliRuntime,
      resolveConfig,
      buildThemeStyle,
      BUILTIN_COLOR_THEMES,
      BUILTIN_FONT_THEMES,
      getCjkSerifCssVariables,
      getFontThemeCssVariables,
    } = await loadNodeRuntime();
    const runtime = await createNodeCliRuntime({
      ...(env ?? {}),
      NODE_SQLITE: sqlite,
    });
    const allSettings = await runtime.services.settings.getAll();
    const navItems = await runtime.services.navItems.list();
    const appConfig = resolveConfig(
      {
        ...(env ?? {}),
        NODE_SQLITE: sqlite,
      },
      allSettings,
    );
    const activeTheme = BUILTIN_COLOR_THEMES.find(
      (theme) => theme.id === (appConfig.themeId || appConfig.defaultThemeId),
    );
    const fontTheme = appConfig.fontThemeId
      ? BUILTIN_FONT_THEMES.find((theme) => theme.id === appConfig.fontThemeId)
      : undefined;
    const fontOverrides = {
      ...getCjkSerifCssVariables(appConfig.siteLanguage),
      ...(fontTheme ? getFontThemeCssVariables(fontTheme) : {}),
    };
    const themeCss = buildThemeStyle(
      activeTheme,
      appConfig.themeMode,
      fontOverrides,
    );
    const appleTouchKey = allSettings.SITE_FAVICON_APPLE_TOUCH || "";
    const exportService = createExportService(runtime.services, {
      siteName: appConfig.siteName,
      siteUrl: appConfig.siteUrl,
      siteDescription: appConfig.siteDescription,
      siteLanguage: appConfig.siteLanguage,
      showJantBrandingOnHome: appConfig.showJantBrandingOnHome,
      homeDefaultView: appConfig.homeDefaultView,
      headerNavMaxVisible: appConfig.headerNavMaxVisible,
      siteFooter: appConfig.siteFooter,
      showHeaderAvatar: appConfig.showHeaderAvatar,
      siteAvatarUrl: appConfig.siteAvatarUrl,
      appleTouchIconUrl: appleTouchKey
        ? getMediaPublicUrl(
            appleTouchKey,
            appConfig.storageDriver,
            appConfig,
          )
        : undefined,
      faviconUrl: appConfig.siteAvatarUrl || undefined,
      faviconVersion: appConfig.faviconVersion,
      themeId: appConfig.themeId,
      defaultThemeId: appConfig.defaultThemeId,
      fontThemeId: appConfig.fontThemeId,
      themeMode: appConfig.themeMode,
      noindex: appConfig.noindex,
      themeCss,
      customCss: appConfig.customCSS,
      r2PublicUrl: appConfig.r2PublicUrl,
      s3PublicUrl: appConfig.s3PublicUrl,
      localPublicUrl: appConfig.localPublicUrl,
      imageTransformUrl: appConfig.imageTransformUrl,
      sitePathPrefix: appConfig.sitePathPrefix,
      navItems,
    });

    return exportService.generateZolaSite();
  } finally {
    sqlite.close();
  }
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      output: {
        type: "string",
        short: "o",
        default: "jant-site-export.zip",
      },
      token: { type: "string" },
      url: { type: "string" },
    },
  });

  if (values.help) {
    console.log("Usage: jant site export [--url <url>] [options]");
    console.log("");
    console.log("Export a Jant site as a Zola ZIP archive.");
    console.log("");
    console.log("Modes:");
    console.log("  Local           No --url; exports from the local Node SQLite runtime");
    console.log("  Remote          --url requires JANT_TOKEN or --token");
    console.log("");
    console.log("Options:");
    console.log("  --url           Remote Jant site URL");
    console.log(
      "  --output, -o    Output ZIP path (default: jant-site-export.zip)",
    );
    console.log("  --token         API token for remote export");
    process.exit(0);
  }

  const output = resolve(process.cwd(), values.output);
  const token = process.env.JANT_TOKEN || values.token;

  if (values.url && !token) {
    console.error("Error: JANT_TOKEN env var is required for remote export");
    process.exit(1);
  }

  const zip = values.url
    ? await exportRemoteSite(values.url, token)
    : await exportLocalSite(process.env);

  writeFileSync(output, Buffer.from(zip));
  const source = values.url ? values.url : getSiteUrl();
  console.log(`Exported site from ${source} to ${values.output}`);
}
