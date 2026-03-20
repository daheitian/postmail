import { queryDemoPublicRemote, readDemoPublicConfig } from "./lib/runtime.mjs";
import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";

function withTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}

async function ensureOk(url, label) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${label} returned ${response.status} for ${url}`);
  }

  await response.arrayBuffer();
  console.log(`Verified ${label}: ${url}`);
}

loadDemoWorkflowEnv({ sites: ["demo"] });

const siteUrl = process.env.JANT_DEMO_PUBLIC_URL || readDemoPublicConfig("SITE_URL");
const r2PublicUrl = readDemoPublicConfig("R2_PUBLIC_URL");
const countsRow = queryDemoPublicRemote(
  `SELECT
      (
        SELECT COUNT(*)
        FROM post
        WHERE deleted_at IS NULL
          AND status = 'published'
          AND COALESCE(visibility, 'public') <> 'private'
      ) AS post_count,
      (SELECT COUNT(*) FROM collection) AS collection_count,
      (SELECT COUNT(*) FROM media) AS media_count`,
)[0];

const postCount = Number(countsRow?.post_count ?? 0);
const collectionCount = Number(countsRow?.collection_count ?? 0);
const mediaCount = Number(countsRow?.media_count ?? 0);

await ensureOk(siteUrl, "homepage");

if (postCount > 0) {
  const firstPost = queryDemoPublicRemote(
    `SELECT path_registry.path
     FROM post
     JOIN path_registry
       ON path_registry.post_id = post.id
      AND path_registry.kind = 'slug'
     WHERE post.deleted_at IS NULL
       AND post.status = 'published'
       AND COALESCE(post.visibility, 'public') <> 'private'
     ORDER BY post.created_at, post.id
     LIMIT 1`,
  )[0];

  if (!firstPost?.path) {
    throw new Error("Expected at least one public post slug to verify.");
  }

  await ensureOk(
    new URL(firstPost.path, withTrailingSlash(siteUrl)).toString(),
    "first post",
  );
}

if (mediaCount > 0) {
  const mediaRows = queryDemoPublicRemote(
    `SELECT storage_key
     FROM media
     ORDER BY created_at, id
     LIMIT 3`,
  );

  for (const row of mediaRows) {
    if (!row.storage_key) continue;
    await ensureOk(
      new URL(row.storage_key, withTrailingSlash(r2PublicUrl)).toString(),
      "media object",
    );
  }
}

console.log("");
console.log("demo-public verification complete.");
console.log(`  Posts:        ${postCount}`);
console.log(`  Collections:  ${collectionCount}`);
console.log(`  Media:        ${mediaCount}`);
