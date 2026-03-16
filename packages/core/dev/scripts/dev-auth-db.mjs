import { execFileSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";

export const DEV_EMAIL = "debug@jant.test";
export const DEFAULT_DEV_PASSWORD = "jant-dev-debug-login";
export const DEFAULT_SITE_NAME = "Jant";

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
  return execFileSync("npx", ["wrangler", "d1", "execute", "DB", ...args], {
    encoding: "utf8",
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

function getNavCount(flag) {
  const result = executeJson(
    flag,
    "SELECT COUNT(*) AS count FROM nav_item",
  );

  return Number(result[0]?.results?.[0]?.count ?? 0);
}

export async function setLocalDevPassword({
  password,
  flag,
  allowMissingAdmin = false,
}) {
  const credentialUsers = getCredentialUsers(flag);
  const targetUser = credentialUsers[0];

  if (!targetUser) {
    const lines = [
      "No credential user found in the local database.",
      "Run `mise run dev-auth-setup` to bootstrap a local debug account.",
    ];

    if (allowMissingAdmin) {
      console.warn(lines.join("\n"));
      return { updated: false };
    }

    console.error(lines.join("\n"));
    process.exit(1);
  }

  const hashedPassword = await hashPassword(password);
  const timestamp = nowSeconds();
  const statements = [
    [
      "UPDATE user",
      `SET email = ${sqlString(DEV_EMAIL)}, role = 'admin', updated_at = ${timestamp}`,
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

export async function ensureLocalDevSetup({
  password,
  flag,
  siteName = DEFAULT_SITE_NAME,
}) {
  const timestamp = nowSeconds();
  const settings = getSettingMap(flag);
  const navCount = getNavCount(flag);
  const credentialUsers = getCredentialUsers(flag);
  const statements = [];

  let createdCredentialUser = false;
  let completedOnboarding = settings.ONBOARDING_STATUS !== "completed";
  let seededNavigation = navCount === 0;

  if (credentialUsers.length === 0) {
    const userId = randomId();
    const accountId = randomId();
    const hashedPassword = await hashPassword(password);

    statements.push(
      [
        "INSERT INTO user (id, name, email, email_verified, image, role, created_at, updated_at)",
        "VALUES (",
        `${sqlString(userId)}, ${sqlString(siteName)}, ${sqlString(DEV_EMAIL)}, 0, NULL, 'admin', ${timestamp}, ${timestamp}`,
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
        `('SITE_LANGUAGE', 'en', ${timestamp})`,
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

  if (navCount === 0) {
    const items = [
      ["link", "Collections", "/c", "a0"],
      ["link", "Archive", "/archive", "a1"],
      ["system", "RSS", "/feed", "a2"],
      ["system", "Settings", "/settings", "a3"],
    ];

    for (const [type, label, url, position] of items) {
      statements.push(
        [
          "INSERT INTO nav_item (id, type, label, url, position, created_at, updated_at)",
          "VALUES (",
          `${sqlString(randomId())}, ${sqlString(type)}, ${sqlString(label)}, ${sqlString(url)}, ${sqlString(position)}, ${timestamp}, ${timestamp}`,
          ")",
        ].join(" "),
      );
    }
  }

  if (statements.length > 0) {
    executeSql(flag, statements.join("; "));
  }

  const passwordResult = await setLocalDevPassword({
    password,
    flag,
    allowMissingAdmin: false,
  });

  return {
    createdCredentialUser,
    completedOnboarding,
    seededNavigation,
    promotedToAdmin: passwordResult.promotedToAdmin ?? false,
  };
}
