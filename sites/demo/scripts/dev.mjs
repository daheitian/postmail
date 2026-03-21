import { spawn } from "node:child_process";

const port = process.env.PORT || "3000";
const wranglerBin = process.platform === "win32" ? "wrangler.cmd" : "wrangler";

const child = spawn(wranglerBin, ["dev", "--port", port], {
  stdio: "inherit",
});

child.once("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.once("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
