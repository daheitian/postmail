export function resolveCliRuntime(values, env = process.env) {
  if (values.local && values.remote) {
    throw new Error("Choose either --local or --remote, not both.");
  }

  if (values.remote) {
    return "d1-remote";
  }

  if (values.local) {
    return "d1-local";
  }

  if (
    (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0) ||
    (typeof env.JANT_DATA_DIR === "string" && env.JANT_DATA_DIR.length > 0) ||
    (typeof env.DATA_DIR === "string" && env.DATA_DIR.length > 0)
  ) {
    return "node";
  }

  return "d1-local";
}

export function getCliRuntimeLabel(runtime) {
  switch (runtime) {
    case "d1-remote":
      return "remote D1";
    case "d1-local":
      return "local D1";
    default:
      return "Node SQLite";
  }
}
