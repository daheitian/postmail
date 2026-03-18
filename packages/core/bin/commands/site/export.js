import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { unzipSync } from "fflate";
import { openNodeSqlite } from "../../lib/node-sqlite.js";
import { loadNodeRuntime } from "../../lib/load-node-runtime.js";
import { localizeSiteExportZipBytes } from "../../lib/site-localize-media.js";

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

function describeProgressUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.pathname || value;
  } catch {
    return value;
  }
}

function logLocalizationProgress(event) {
  if (event.type === "scan-complete") {
    console.log(
      `Localizing media references... found ${event.mediaReferences} referenced files in ${event.markdownFiles} content files`,
    );
    return;
  }

  if (event.type === "asset-downloaded") {
    console.log(
      `  [${event.index}/${event.total}] Downloaded ${describeProgressUrl(event.rawUrl)}`,
    );
    return;
  }

  if (event.type === "asset-reused") {
    console.log(
      `  [${event.index}/${event.total}] Reused ${describeProgressUrl(event.rawUrl)}`,
    );
    return;
  }

  if (event.type === "asset-failed") {
    console.log(
      `  [${event.index}/${event.total}] Failed ${describeProgressUrl(event.rawUrl)}`,
    );
    return;
  }

  if (event.type === "rewrite-complete") {
    console.log(
      `Rewriting export files... updated ${event.filesUpdated} content files${event.configUpdated ? " and config.toml" : ""}`,
    );
  }
}

function getStorageKeyFromUrl(url, appConfig) {
  try {
    const resolvedUrl = new URL(url, appConfig.siteUrl);
    let pathname = resolvedUrl.pathname;
    const publicPathPrefixes = [
      appConfig.r2PublicUrl,
      appConfig.s3PublicUrl,
      appConfig.localPublicUrl,
    ]
      .filter(Boolean)
      .map((value) => {
        try {
          const parsed = new URL(value);
          return parsed.pathname.replace(/\/+$/, "");
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    for (const prefix of publicPathPrefixes) {
      if (pathname.startsWith(`${prefix}/`)) {
        pathname = pathname.slice(prefix.length + 1);
        break;
      }
      if (pathname === prefix) {
        pathname = "";
        break;
      }
    }

    const sitePathPrefix = appConfig.sitePathPrefix || "";
    if (sitePathPrefix && pathname.startsWith(`${sitePathPrefix}/`)) {
      pathname = pathname.slice(sitePathPrefix.length + 1);
    } else {
      pathname = pathname.replace(/^\/+/, "");
    }

    if (!pathname.startsWith("media/") && !pathname.startsWith("favicon/")) {
      return null;
    }

    return pathname;
  } catch {
    return null;
  }
}

async function readStorageBody(body) {
  const reader = body.getReader();
  const chunks = [];
  let totalLength = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const bytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  return bytes;
}

function createLocalAssetLoader(storage, appConfig) {
  if (!storage) {
    return null;
  }

  return async ({ resolvedUrl }) => {
    const storageKey = getStorageKeyFromUrl(resolvedUrl, appConfig);
    if (!storageKey) {
      return null;
    }

    const object = await storage.get(storageKey);
    if (!object?.body) {
      return null;
    }

    return {
      bytes: await readStorageBody(object.body),
      contentType: object.contentType || "",
    };
  };
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

    return {
      zip: await exportService.generateZolaSite(),
      assetLoader: createLocalAssetLoader(runtime.storage, appConfig),
    };
  } finally {
    sqlite.close();
  }
}

export async function run(argv) {
  const noLocalizeMedia = argv.includes("--no-localize-media");
  const { values } = parseArgs({
    args: argv.filter((arg) => arg !== "--no-localize-media"),
    options: {
      directory: {
        type: "string",
        short: "d",
      },
      help: { type: "boolean", short: "h" },
      "localize-media": { type: "boolean" },
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
    console.log("Export a Jant site as a Zola ZIP archive or directory.");
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
    console.log(
      "  --directory, -d Export directly to a directory for zola serve/debugging",
    );
    console.log(
      "  --localize-media    Download referenced media into static/media/ (default: on)",
    );
    console.log(
      "  --no-localize-media Skip media localization and keep original URLs",
    );
    console.log("  --token         API token for remote export");
    console.log("");
    console.log("Examples:");
    console.log("  jant site export --directory ./jant-site");
    console.log("  cd ./jant-site && zola serve");
    process.exit(0);
  }

  if (values.directory && values.output !== "jant-site-export.zip") {
    console.error("Error: use either --output or --directory, not both");
    process.exit(1);
  }

  const output = resolve(process.cwd(), values.output);
  const outputDirectory = values.directory
    ? resolve(process.cwd(), values.directory)
    : null;
  const token = process.env.JANT_TOKEN || values.token;
  const localizeMedia = values["localize-media"] ?? !noLocalizeMedia;

  if (values.url && !token) {
    console.error("Error: JANT_TOKEN env var is required for remote export");
    process.exit(1);
  }

  console.log(
    values.url
      ? `Exporting site from ${values.url}...`
      : "Exporting site from the local runtime...",
  );

  const exported = values.url
    ? { zip: await exportRemoteSite(values.url, token), assetLoader: null }
    : await exportLocalSite(process.env);
  let zip = exported.zip;
  let localizeStats = null;

  if (localizeMedia) {
    console.log("Preparing localized export ZIP...");
    const localized = await localizeSiteExportZipBytes(zip, {
      assetLoader: exported.assetLoader,
      logger: logLocalizationProgress,
    });
    zip = localized.zipBytes;
    localizeStats = localized.stats;
  }

  const source = values.url ? values.url : getSiteUrl();
  if (outputDirectory) {
    let existingEntries = [];
    try {
      mkdirSync(outputDirectory, { recursive: true });
      existingEntries = readdirSync(outputDirectory, {
        withFileTypes: true,
      }).filter((entry) => !entry.name.startsWith("."));
    } catch {
      console.error(`Error: couldn't prepare directory ${values.directory}`);
      process.exit(1);
    }
    if (existingEntries.length > 0) {
      console.error(
        `Error: directory is not empty: ${values.directory}. Choose an empty directory path.`,
      );
      process.exit(1);
    }

    console.log(`Writing export directory ${values.directory}...`);
    const files = unzipSync(zip);
    for (const [relativePath, bytes] of Object.entries(files)) {
      const fullPath = resolve(outputDirectory, relativePath);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, Buffer.from(bytes));
    }
    console.log(`Exported site from ${source} to ${values.directory}`);
    console.log(`Preview with: cd ${values.directory} && zola serve`);
  } else {
    console.log(`Writing ${values.output}...`);
    writeFileSync(output, Buffer.from(zip));
    console.log(`Exported site from ${source} to ${values.output}`);
  }

  if (localizeStats) {
    const details = [
      `localized ${localizeStats.downloaded} media files`,
      localizeStats.reused > 0
        ? `${localizeStats.reused} already localized`
        : null,
      localizeStats.failed > 0
        ? `${localizeStats.failed} failed and were left as original URLs`
        : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(`Media localization: ${details}`);
  }
}
