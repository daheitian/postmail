import {
  DEMO_SOURCE_DIR,
  deleteDemoSourceObject,
  readDemoSourceConfig,
} from "./lib/runtime.mjs";
import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";
import {
  escapeSqlString,
  queryRemoteD1,
  resolveSingleRemoteSite,
} from "../lib/remote-site-ops.mjs";

loadDemoWorkflowEnv({ sites: ["demo-source"] });

const site = resolveSingleRemoteSite({
  cwd: DEMO_SOURCE_DIR,
  label: "demo-source",
});
const escapedSiteId = escapeSqlString(site.id);

const mediaRows = queryRemoteD1({
  cwd: DEMO_SOURCE_DIR,
  sql: `
   SELECT storage_key, poster_key
   FROM media
   WHERE site_id = '${escapedSiteId}'
   ORDER BY created_at, id`,
});
const settingRows = queryRemoteD1({
  cwd: DEMO_SOURCE_DIR,
  sql: `
   SELECT value
   FROM site_setting
   WHERE site_id = '${escapedSiteId}'
     AND key IN ('SITE_AVATAR', 'SITE_FAVICON_APPLE_TOUCH')
   ORDER BY key`,
});

const keys = new Set();

for (const row of mediaRows) {
  if (row.storage_key) keys.add(row.storage_key);
  if (row.poster_key) keys.add(row.poster_key);
}

for (const row of settingRows) {
  if (row.value) keys.add(row.value);
}

if (keys.size === 0) {
  console.log("No demo-source storage objects are currently referenced.");
  process.exit(0);
}

const bucketName = readDemoSourceConfig("bucket_name");
console.log(`Deleting ${keys.size} referenced object(s) from ${bucketName}...`);

let deleted = 0;
const failures = [];

for (const key of keys) {
  try {
    deleteDemoSourceObject(key);
    deleted += 1;
  } catch (error) {
    failures.push({ key, message: error.message });
  }
}

console.log(`Deleted ${deleted} object(s).`);

if (failures.length > 0) {
  console.error("");
  console.error("Some objects could not be deleted:");
  for (const failure of failures) {
    console.error(`- ${failure.key}`);
    console.error(`  ${failure.message}`);
  }
  process.exit(1);
}
