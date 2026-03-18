import { run as runDbExport } from "../export.js";

export async function run(argv) {
  return runDbExport(argv);
}
