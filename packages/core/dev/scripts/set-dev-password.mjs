import {
  DEFAULT_DEV_PASSWORD,
  DEV_EMAIL,
  setLocalDevPassword,
} from "./dev-auth-db.mjs";

const isRemote = process.argv.includes("--remote");
const allowMissingAdmin = process.argv.includes("--allow-missing-admin");
const flag = isRemote ? "--remote" : "--local";

const password =
  process.argv.find(
    (arg) =>
      !arg.startsWith("-") && arg !== process.argv[0] && arg !== process.argv[1],
  ) || DEFAULT_DEV_PASSWORD;

const result = await setLocalDevPassword({
  password,
  flag,
  allowMissingAdmin,
});

if (!result.updated) {
  process.exit(0);
}

console.log("");
console.log("Dev credentials set.");
console.log(`  Email:    ${DEV_EMAIL}`);
console.log(`  Password: ${password}`);
if (result.promotedToAdmin) {
  console.log("  Role:     promoted to admin");
}
