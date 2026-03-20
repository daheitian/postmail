import { randomBytes, scryptSync } from "node:crypto";
import { generateKeyBetween } from "fractional-indexing";
import { runLocalWrangler } from "../../bin/lib/wrangler-cli.js";

export const DEV_EMAIL = "debug@jant.test";
export const DEFAULT_DEV_PASSWORD = "jant-dev-debug-login";
export const DEFAULT_SITE_NAME = "Jant";
export const DEFAULT_SITE_LANGUAGE = "en";

const DEFAULT_SYSTEM_NAV_ITEMS = [
  { systemKey: "collections", label: "Collections", url: "/c" },
  { systemKey: "archive", label: "Archive", url: "/archive" },
  { systemKey: "rss", label: "RSS", url: "/feed" },
  { systemKey: "settings", label: "Settings", url: "/settings" },
];

const PASSWORD_HASH_PREFIX = "custom-scrypt";
const PASSWORD_HASH_N = 16_384;
const PASSWORD_HASH_R = 16;
const PASSWORD_HASH_P = 1;
const PASSWORD_HASH_KEY_LENGTH = 64;
const PASSWORD_HASH_SALT_BYTES = 16;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function randomId(byteLength = 16) {
  return randomBytes(byteLength).toString("hex");
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function runWrangler(args, options = {}) {
  return runLocalWrangler(["d1", "execute", "DB", ...args], {
    encoding: "utf-8",
    ...options,
  });
}

export function executeJson(flag, sql) {
  const stdout = runWrangler([flag, "--command", sql, "--json"]);
  return JSON.parse(stdout);
}

export function executeSql(flag, sql) {
  runWrangler([flag, "--command", sql], { stdio: "inherit" });
}

export async function hashPassword(password) {
  const saltHex = randomBytes(PASSWORD_HASH_SALT_BYTES).toString("hex");
  const derivedKey = scryptSync(
    password.normalize("NFKC"),
    saltHex,
    PASSWORD_HASH_KEY_LENGTH,
    {
      N: PASSWORD_HASH_N,
      r: PASSWORD_HASH_R,
      p: PASSWORD_HASH_P,
      maxmem: 128 * PASSWORD_HASH_N * PASSWORD_HASH_R * 2,
    },
  );

  return [
    PASSWORD_HASH_PREFIX,
    String(PASSWORD_HASH_N),
    String(PASSWORD_HASH_R),
    String(PASSWORD_HASH_P),
    String(PASSWORD_HASH_KEY_LENGTH),
    saltHex,
    bytesToHex(derivedKey),
  ].join("$");
}

function getCredentialUsers(flag) {
  const result = executeJson(
    flag,
    [
      "SELECT user.id AS user_id, user.name, user.email, user.role,",
      "account.id AS account_row_id",
      "FROM user",
      "JOIN account ON account.user_id = user.id",
      "WHERE account.provider_id = 'credential'",
      "ORDER BY CASE WHEN user.role = 'admin' THEN 0 ELSE 1 END, user.created_at ASC",
    ].join(" "),
  );

  return result[0]?.results ?? [];
}

function getSettingMap(flag) {
  const result = executeJson(
    flag,
    [
      "SELECT key, value FROM setting",
      "WHERE key IN ('ONBOARDING_STATUS', 'SITE_NAME', 'SITE_LANGUAGE')",
    ].join(" "),
  );

  return Object.fromEntries(
    (result[0]?.results ?? []).map((row) => [row.key, row.value]),
  );
}

function getOrderedNavPositions(flag) {
  const result = executeJson(
    flag,
    "SELECT position FROM nav_item ORDER BY position",
  );

  return result[0]?.results ?? [];
}

function getExistingSystemNavKeys(flag) {
  const result = executeJson(
    flag,
    "SELECT system_key AS systemKey FROM nav_item WHERE system_key IS NOT NULL",
  );

  return new Set(
    (result[0]?.results ?? []).flatMap((row) =>
      row.systemKey ? [row.systemKey] : [],
    ),
  );
}

function buildDefaultNavInsertStatements(flag, timestamp) {
  const existingKeys = getExistingSystemNavKeys(flag);
  const positions = getOrderedNavPositions(flag);
  let lastPosition = positions.at(-1)?.position ?? null;

  const statements = [];
  let seededNavigation = false;

  for (const item of DEFAULT_SYSTEM_NAV_ITEMS) {
    if (existingKeys.has(item.systemKey)) continue;

    const position = generateKeyBetween(lastPosition, null);
    statements.push(
      [
        "INSERT INTO nav_item (id, type, system_key, label, url, position, created_at, updated_at)",
        "VALUES (",
        `${sqlString(randomId())}, 'system', ${sqlString(item.systemKey)}, ${sqlString(item.label)}, ${sqlString(item.url)}, ${sqlString(position)}, ${timestamp}, ${timestamp}`,
        ")",
      ].join(" "),
    );

    lastPosition = position;
    existingKeys.add(item.systemKey);
    seededNavigation = true;
  }

  return { statements, seededNavigation };
}

export async function setCredentialPassword({
  password,
  flag,
  email,
  allowMissingAdmin = false,
  missingAdminMessage = [
    "No credential user found in the database.",
    "Run the matching bootstrap command before setting credentials.",
  ].join("\n"),
}) {
  const credentialUsers = getCredentialUsers(flag);
  const targetUser = credentialUsers[0];

  if (!targetUser) {
    if (allowMissingAdmin) {
      console.warn(missingAdminMessage);
      return { updated: false };
    }

    console.error(missingAdminMessage);
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);
  const timestamp = nowSeconds();
  const statements = [
    [
      "UPDATE user",
      `SET email = ${sqlString(email)}, role = 'admin', updated_at = ${timestamp}`,
      `WHERE id = ${sqlString(targetUser.user_id)}`,
    ].join(" "),
    [
      "UPDATE account",
      `SET password = ${sqlString(hashedPassword)}, updated_at = ${timestamp}`,
      `WHERE id = ${sqlString(targetUser.account_row_id)}`,
    ].join(" "),
  ];

  executeSql(flag, statements.join("; "));

  return {
    updated: true,
    promotedToAdmin: targetUser.role !== "admin",
    previousEmail: targetUser.email,
  };
}

export async function ensureManagedSetup({
  password,
  flag,
  email,
  siteName = DEFAULT_SITE_NAME,
  siteLanguage = DEFAULT_SITE_LANGUAGE,
  missingAdminMessage = [
    "No credential user found in the database.",
    "Run the matching bootstrap command before setting credentials.",
  ].join("\n"),
}) {
  const timestamp = nowSeconds();
  const settings = getSettingMap(flag);
  const credentialUsers = getCredentialUsers(flag);
  const statements = [];

  let createdCredentialUser = false;
  const completedOnboarding = settings.ONBOARDING_STATUS !== "completed";

  if (credentialUsers.length === 0) {
    const userId = randomId();
    const accountId = randomId();
    const hashedPassword = await hashPassword(password);

    statements.push(
      [
        "INSERT INTO user (id, name, email, email_verified, image, role, created_at, updated_at)",
        "VALUES (",
        `${sqlString(userId)}, ${sqlString(siteName)}, ${sqlString(email)}, 0, NULL, 'admin', ${timestamp}, ${timestamp}`,
        ")",
      ].join(" "),
    );
    statements.push(
      [
        "INSERT INTO account (",
        "id, account_id, provider_id, user_id, access_token, refresh_token, id_token,",
        "access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at",
        ") VALUES (",
        `${sqlString(accountId)}, ${sqlString(userId)}, 'credential', ${sqlString(userId)}, NULL, NULL, NULL, NULL, NULL, NULL, ${sqlString(hashedPassword)}, ${timestamp}, ${timestamp}`,
        ")",
      ].join(" "),
    );

    createdCredentialUser = true;
  }

  const { statements: navStatements, seededNavigation } =
    buildDefaultNavInsertStatements(flag, timestamp);
  statements.push(...navStatements);

  if (!settings.SITE_NAME) {
    statements.push(
      [
        "INSERT INTO setting (key, value, updated_at) VALUES",
        `('SITE_NAME', ${sqlString(siteName)}, ${timestamp})`,
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      ].join(" "),
    );
  }

  if (!settings.SITE_LANGUAGE) {
    statements.push(
      [
        "INSERT INTO setting (key, value, updated_at) VALUES",
        `('SITE_LANGUAGE', ${sqlString(siteLanguage)}, ${timestamp})`,
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      ].join(" "),
    );
  }

  if (settings.ONBOARDING_STATUS !== "completed") {
    statements.push(
      [
        "INSERT INTO setting (key, value, updated_at) VALUES",
        `('ONBOARDING_STATUS', 'completed', ${timestamp})`,
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      ].join(" "),
    );
  }

  if (statements.length > 0) {
    executeSql(flag, statements.join("; "));
  }

  const passwordResult = await setCredentialPassword({
    password,
    flag,
    email,
    allowMissingAdmin: false,
    missingAdminMessage,
  });

  return {
    createdCredentialUser,
    completedOnboarding,
    seededNavigation,
    promotedToAdmin: passwordResult.promotedToAdmin ?? false,
  };
}

export async function setLocalDevPassword({
  password,
  flag,
  allowMissingAdmin = false,
}) {
  return setCredentialPassword({
    password,
    flag,
    email: DEV_EMAIL,
    allowMissingAdmin,
    missingAdminMessage: [
      "No credential user found in the local database.",
      "Run `mise run dev-auth-bootstrap` to bootstrap a local debug account.",
    ].join("\n"),
  });
}

export async function ensureLocalDevSetup({
  password,
  flag,
  siteName = DEFAULT_SITE_NAME,
}) {
  return ensureManagedSetup({
    password,
    flag,
    email: DEV_EMAIL,
    siteName,
    siteLanguage: DEFAULT_SITE_LANGUAGE,
    missingAdminMessage: [
      "No credential user found in the local database.",
      "Run `mise run dev-auth-bootstrap` to bootstrap a local debug account.",
    ].join("\n"),
  });
}
