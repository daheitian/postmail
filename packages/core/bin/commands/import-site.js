import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { parseArgs } from "node:util";

/**
 * Parse front matter from a Markdown file.
 * Supports both YAML (---...---) and TOML (+++...+++) delimiters.
 * Returns { frontMatter, body }.
 */
async function parseFrontMatter(content) {
  // Try YAML front matter (---...---)
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (yamlMatch) {
    const { parse } = await import("yaml");
    const frontMatter = parse(yamlMatch[1]) || {};
    return { frontMatter, body: yamlMatch[2] };
  }

  // Try TOML front matter (+++...+++)
  const tomlMatch = content.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/);
  if (tomlMatch) {
    const { parse } = await import("smol-toml");
    const frontMatter = parse(tomlMatch[1]);
    return { frontMatter, body: tomlMatch[2] };
  }

  return { frontMatter: {}, body: content };
}

/**
 * Parse reply markers from post body.
 * Returns array of { attrs, body } segments where the first is the root.
 */
function splitReplies(body) {
  const markerRegex = /<!-- jant:reply (.*?) -->/g;

  // Split body by markers, keeping the marker data
  const markers = [];
  let match;
  while ((match = markerRegex.exec(body)) !== null) {
    // Parse key="value" pairs from the marker
    const attrs = {};
    const attrRegex = /(\w+)="([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(match[1])) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }
    markers.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      attrs,
    });
  }

  if (markers.length === 0) {
    return [{ attrs: null, body: body.trim() }];
  }

  const segments = [];

  // Root segment: everything before the first marker
  segments.push({ attrs: null, body: body.slice(0, markers[0].index).trim() });

  // Reply segments: between consecutive markers
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].endIndex;
    const end = i + 1 < markers.length ? markers[i + 1].index : body.length;
    segments.push({
      attrs: markers[i].attrs,
      body: body.slice(start, end).trim(),
    });
  }

  return segments;
}

/**
 * Find image URLs in markdown and return them.
 */
function findImageUrls(markdown) {
  const urls = [];
  const regex = /!\[[^\]]*\]\(([^)\s]+)/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Download an image and upload it to the Jant API.
 * Returns the new URL, or null on failure.
 */
async function uploadImage(imageUrl, apiUrl, token) {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();
    const filename = imageUrl.split("/").pop() || "image.jpg";

    const formData = new FormData();
    formData.append("file", blob, filename);

    const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!uploadResponse.ok) return null;
    const data = await uploadResponse.json();
    return { url: data.url, id: data.id };
  } catch {
    return null;
  }
}

/**
 * Replace image URLs in markdown with newly uploaded URLs.
 */
function replaceImageUrls(markdown, urlMap) {
  let result = markdown;
  for (const [oldUrl, newUrl] of urlMap) {
    result = result.replaceAll(oldUrl, newUrl);
  }
  return result;
}

class ApiError extends Error {
  constructor(status, text) {
    super(`HTTP ${status}: ${text}`);
    this.status = status;
  }
}

async function apiCall(method, path, apiUrl, token, body) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    const cause = err.cause?.code || err.cause?.message || err.message;
    if (
      cause === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
      cause?.includes("certificate")
    ) {
      console.error(`\nSSL certificate error connecting to ${apiUrl}`);
      console.error("If using a local/self-signed certificate, run with:");
      console.error("  NODE_TLS_REJECT_UNAUTHORIZED=0 jant import-site ...");
      console.error("Or use: node --use-system-ca bin/jant.js import-site ...");
      process.exit(1);
    }
    throw new Error(
      `Network error calling ${method} ${apiUrl}${path}: ${cause}`,
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, text);
  }

  return response.json();
}

/**
 * Recursively walk a directory's content/ folder and collect post/collection files.
 */
async function walkContent(rootDir, postFiles, collectionFiles) {
  const contentDir = join(rootDir, "content");
  const contentStat = await stat(contentDir).catch(() => null);
  if (!contentStat?.isDirectory()) {
    console.error(`No content/ directory found in ${rootDir}`);
    process.exit(1);
  }

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name === "index.md" || entry.name === "_index.md") {
        const relPath = relative(rootDir, fullPath).replace(/\\/g, "/");
        const content = await readFile(fullPath, "utf-8");
        if (
          relPath.startsWith("content/c/") &&
          relPath.endsWith("/_index.md")
        ) {
          collectionFiles.push({ path: relPath, content });
        } else if (
          relPath.startsWith("content/") &&
          relPath.endsWith("/index.md") &&
          relPath !== "content/_index.md"
        ) {
          postFiles.push({ path: relPath, content });
        }
      }
    }
  }

  await walk(contentDir);
}

export async function run(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      url: { type: "string" },
      token: { type: "string" },
      path: { type: "string", default: "." },
      "dry-run": { type: "boolean", default: false },
      "skip-media": { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  });

  if (values.help) {
    console.log("Usage: jant import-site --url <url> [options]");
    console.log("");
    console.log("Import a Zola export ZIP into a Jant instance.");
    console.log("");
    console.log("Options:");
    console.log("  --url         Target Jant instance URL (required)");
    console.log(
      "  --path        Path to export directory or ZIP file (default: .)",
    );
    console.log("  --dry-run     Parse and validate without making API calls");
    console.log("  --skip-media  Skip image download/upload");
    console.log("");
    console.log("Authentication:");
    console.log("  Set JANT_TOKEN env var (recommended):");
    console.log("    export JANT_TOKEN=jnt_your_token");
    console.log("    jant import-site --url https://your-site.com");
    process.exit(0);
  }

  if (!values.url) {
    console.error("Error: --url is required");
    process.exit(1);
  }

  const token = process.env.JANT_TOKEN || values.token;
  if (!token && !values["dry-run"]) {
    console.error(
      "Error: JANT_TOKEN env var is required (unless using --dry-run)",
    );
    console.error("");
    console.error("  export JANT_TOKEN=jnt_your_token");
    process.exit(1);
  }

  const apiUrl = values.url.replace(/\/$/, "");
  const dryRun = values["dry-run"];
  const skipMedia = values["skip-media"];

  // 1. Read source — directory or ZIP
  const inputPath = resolve(process.cwd(), values.path);
  const inputStat = await stat(inputPath).catch(() => null);

  if (!inputStat) {
    console.error(`Path not found: ${inputPath}`);
    process.exit(1);
  }

  const postFiles = [];
  const collectionFiles = [];

  if (inputStat.isDirectory()) {
    console.log(`Reading directory ${inputPath}...`);
    await walkContent(inputPath, postFiles, collectionFiles);
  } else {
    console.log(`Reading ZIP ${inputPath}...`);
    const zipData = await readFile(inputPath);
    const { unzipSync } = await import("fflate");
    const files = unzipSync(new Uint8Array(zipData));
    const decoder = new TextDecoder();

    for (const [path, data] of Object.entries(files)) {
      if (path.startsWith("content/c/") && path.endsWith("/_index.md")) {
        collectionFiles.push({ path, content: decoder.decode(data) });
      } else if (
        path.startsWith("content/") &&
        path.endsWith("/index.md") &&
        path !== "content/_index.md"
      ) {
        postFiles.push({ path, content: decoder.decode(data) });
      }
    }
  }

  console.log(
    `Found ${postFiles.length} posts and ${collectionFiles.length} collections`,
  );

  // 3. Fetch existing collections and create missing ones
  const collectionSlugToId = new Map();

  if (!dryRun) {
    try {
      const existing = await apiCall("GET", "/api/collections", apiUrl, token);
      for (const col of existing.collections || []) {
        collectionSlugToId.set(col.slug, col.id);
      }
    } catch (err) {
      console.error(`Error fetching existing collections: ${err.message}`);
      process.exit(1);
    }
  }

  for (const { path, content } of collectionFiles) {
    const { frontMatter } = await parseFrontMatter(content);
    const slug = path.replace("content/c/", "").replace("/_index.md", "");

    if (collectionSlugToId.has(slug)) {
      console.log(`Skipped collection (exists): ${frontMatter.title || slug}`);
      continue;
    }

    if (dryRun) {
      console.log(
        `[dry-run] Would create collection: ${frontMatter.title || slug}`,
      );
      collectionSlugToId.set(slug, `dry-run-${slug}`);
      continue;
    }

    try {
      const result = await apiCall("POST", "/api/collections", apiUrl, token, {
        title: frontMatter.title || slug,
        slug,
        description: frontMatter.description || null,
      });
      collectionSlugToId.set(slug, result.id);
      console.log(`Created collection: ${frontMatter.title || slug}`);
    } catch (err) {
      console.error(`Error creating collection "${slug}": ${err.message}`);
      process.exit(1);
    }
  }

  // 4. Process posts
  let postsCreated = 0;
  let repliesCreated = 0;
  let imagesUploaded = 0;
  let aliasesCreated = 0;
  let skipped = 0;

  for (const { path, content } of postFiles) {
    const { frontMatter, body } = await parseFrontMatter(content);

    const segments = splitReplies(body);
    const rootSegment = segments[0];
    const replySegments = segments.slice(1);

    // Resolve collection IDs from taxonomy slugs
    const collectionIds = [];
    const taxonomyCollections =
      frontMatter.taxonomies?.c || frontMatter.taxonomies?.collections || [];
    for (const colSlug of taxonomyCollections) {
      const id = collectionSlugToId.get(colSlug);
      if (id) collectionIds.push(id);
    }

    // Process images in root body
    let rootBody = rootSegment?.body || "";
    const mediaIds = [];

    if (!skipMedia && !dryRun && rootBody) {
      const imageUrls = findImageUrls(rootBody);
      const urlMap = new Map();

      for (const imageUrl of imageUrls) {
        if (imageUrl.startsWith("data:")) continue;
        const result = await uploadImage(imageUrl, apiUrl, token);
        if (result) {
          urlMap.set(imageUrl, result.url);
          mediaIds.push(result.id);
          imagesUploaded++;
        }
      }

      if (urlMap.size > 0) {
        rootBody = replaceImageUrls(rootBody, urlMap);
      }
    }

    const extra = frontMatter.extra || {};
    const format = extra.format || "note";

    const postData = {
      format,
      title: frontMatter.title != null ? String(frontMatter.title) : undefined,
      bodyMarkdown: rootBody || undefined,
      slug: frontMatter.slug != null ? String(frontMatter.slug) : undefined,
      status: frontMatter.draft ? "draft" : "published",
      collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      publishedAt:
        !frontMatter.draft && frontMatter.date
          ? Math.floor(new Date(frontMatter.date).getTime() / 1000)
          : undefined,
      pinned: extra.pinned || undefined,
      featured: extra.featured || undefined,
      rating: extra.rating || undefined,
    };

    if (format === "link" && extra.link_url) {
      postData.url = extra.link_url;
    }
    if (format === "quote" && extra.quote_text) {
      postData.quoteText = extra.quote_text;
    }

    if (dryRun) {
      console.log(
        `[dry-run] Would create post: ${frontMatter.title || frontMatter.slug || "(untitled)"} (${format})`,
      );
      if (replySegments.length > 0) {
        console.log(`  [dry-run] With ${replySegments.length} replies`);
      }
      postsCreated++;
      repliesCreated += replySegments.length;
      continue;
    }

    const postLabel = frontMatter.title || frontMatter.slug || "(untitled)";

    const progress = `[${postsCreated + skipped + 1}/${postFiles.length}]`;

    let post;
    try {
      post = await apiCall("POST", "/api/posts", apiUrl, token, postData);
      postsCreated++;
      const replyInfo =
        replySegments.length > 0 ? ` (+${replySegments.length} replies)` : "";
      console.log(`${progress} Created: ${postLabel}${replyInfo}`);
    } catch (err) {
      if (err.status === 409) {
        console.log(`${progress} Skipped: ${postLabel}`);
        skipped++;
      } else {
        console.error(`Error creating post "${postLabel}": ${err.message}`);
        process.exit(1);
      }
    }

    // Create custom URL aliases from front matter (also for skipped posts)
    const aliases = frontMatter.aliases || [];
    const postSlug =
      frontMatter.slug != null ? String(frontMatter.slug) : post?.slug;
    for (const alias of aliases) {
      const aliasPath = alias.startsWith("/") ? alias : `/${alias}`;
      if (aliasPath === `/${postSlug}`) continue; // skip self-reference
      try {
        await apiCall("POST", "/api/custom-urls", apiUrl, token, {
          path: aliasPath,
          targetType: "post",
          targetId: postSlug,
        });
        aliasesCreated++;
      } catch (err) {
        if (err.status === 409) continue; // alias already exists
        console.warn(
          `  Warning: Failed to create alias "${aliasPath}": ${err.message}`,
        );
      }
    }

    // Create replies (only for newly created posts)
    if (!post) continue;
    for (const replySegment of replySegments) {
      const replyAttrs = replySegment.attrs || {};
      let replyBody = replySegment.body || "";
      const replyMediaIds = [];

      if (!skipMedia && replyBody) {
        const imageUrls = findImageUrls(replyBody);
        const urlMap = new Map();

        for (const imageUrl of imageUrls) {
          if (imageUrl.startsWith("data:")) continue;
          const result = await uploadImage(imageUrl, apiUrl, token);
          if (result) {
            urlMap.set(imageUrl, result.url);
            replyMediaIds.push(result.id);
            imagesUploaded++;
          }
        }

        if (urlMap.size > 0) {
          replyBody = replaceImageUrls(replyBody, urlMap);
        }
      }

      const replyFormat = replyAttrs.format || "note";
      const replyData = {
        format: replyFormat,
        title: replyAttrs.title || undefined,
        bodyMarkdown: replyBody || undefined,
        replyToId: post.id,
        mediaIds: replyMediaIds.length > 0 ? replyMediaIds : undefined,
        publishedAt: replyAttrs.date
          ? Math.floor(new Date(replyAttrs.date).getTime() / 1000)
          : undefined,
        rating: replyAttrs.rating ? Number(replyAttrs.rating) : undefined,
      };

      if (replyFormat === "link" && replyAttrs.url) {
        replyData.url = replyAttrs.url;
      }
      if (replyFormat === "quote" && replyAttrs.quote_text) {
        replyData.quoteText = decodeURIComponent(replyAttrs.quote_text);
      }

      try {
        await apiCall("POST", "/api/posts", apiUrl, token, replyData);
        repliesCreated++;
      } catch (err) {
        if (err.status === 409) {
          console.log(`  Skipped reply (exists)`);
          skipped++;
          continue;
        }
        console.error(`  Error creating reply: ${err.message}`);
        process.exit(1);
      }
    }
  }

  // 5. Summary
  console.log("");
  console.log("Import complete:");
  console.log(`  Posts created: ${postsCreated}`);
  console.log(`  Replies created: ${repliesCreated}`);
  console.log(`  Images uploaded: ${imagesUploaded}`);
  if (aliasesCreated > 0) {
    console.log(`  Aliases created: ${aliasesCreated}`);
  }
  if (skipped > 0) {
    console.log(`  Skipped (already exist): ${skipped}`);
  }
  if (dryRun) {
    console.log("  (dry-run mode — no changes were made)");
  }
}
