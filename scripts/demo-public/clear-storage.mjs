import {
  deleteDemoPublicObject,
  queryDemoPublicRemote,
  readDemoPublicConfig,
} from "./lib/runtime.mjs";
import { loadDemoWorkflowEnv } from "../demo-shared/env.mjs";

loadDemoWorkflowEnv({ sites: ["demo"] });

const mediaRows = queryDemoPublicRemote(
  `SELECT storage_key, poster_key
   FROM media
   ORDER BY created_at, id`,
);
const settingRows = queryDemoPublicRemote(
  `SELECT value
   FROM setting
   WHERE key IN ('SITE_AVATAR', 'SITE_FAVICON_APPLE_TOUCH')
   ORDER BY key`,
);

const keys = new Set();

for (const row of mediaRows) {
  if (row.storage_key) keys.add(row.storage_key);
  if (row.poster_key) keys.add(row.poster_key);
}

for (const row of settingRows) {
  if (row.value) keys.add(row.value);
}

if (keys.size === 0) {
  console.log("No demo-public storage objects are currently referenced.");
  process.exit(0);
}

const bucketName = readDemoPublicConfig("bucket_name");
console.log(`Deleting ${keys.size} referenced object(s) from ${bucketName}...`);

let deleted = 0;
const failures = [];

for (const key of keys) {
  try {
    deleteDemoPublicObject(key);
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
