export function resolveCliRuntime(values, env = process.env) {
  const flags = [values.local, values.remote, values.node].filter(Boolean);
  if (flags.length > 1) {
    throw new Error("Choose only one of --local, --remote, or --node.");
  }

  if (values.remote) {
    return "d1-remote";
  }

  if (values.local) {
    return "d1-local";
  }

  if (values.node) {
    return "node";
  }

  if (
    (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0) ||
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
      return "Node database";
  }
}
