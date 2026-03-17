export async function loadNodeRuntime() {
  try {
    return await import(new URL("../../dist/node.js", import.meta.url));
  } catch (error) {
    throw new Error(
      "Node runtime build is missing. Run `pnpm --filter @jant/core build` or use the published package.",
      { cause: error },
    );
  }
}
