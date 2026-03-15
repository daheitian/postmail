import { execSync } from "child_process";
import { randomBytes, scryptSync } from "node:crypto";

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

async function hashPassword(password) {
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

const isRemote = process.argv.includes("--remote");
const flag = isRemote ? "--remote" : "--local";

const password = process.argv.find(
  (a) =>
    !a.startsWith("-") &&
    a !== process.argv[0] &&
    a !== process.argv[1] &&
    a !== "--remote",
);

if (!password) {
  console.error(
    "Usage: node scripts/set-dev-password.mjs <password> [--remote]",
  );
  process.exit(1);
}

const hashedPassword = await hashPassword(password);

const sql = [
  `UPDATE user SET email = 'demo@jant.me' WHERE role = 'admin'`,
  `UPDATE account SET password = '${hashedPassword}' WHERE provider_id = 'credential'`,
].join("; ");

execSync(`npx wrangler d1 execute DB ${flag} --command "${sql}"`, {
  stdio: "inherit",
});

console.log("");
console.log("Dev credentials set successfully.");
console.log("  Email:    demo@jant.me");
console.log(`  Password: ${password}`);
