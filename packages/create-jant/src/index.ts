import { program } from "commander";
import * as p from "@clack/prompts";
import chalk from "chalk";
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @jant/core version - injected at build time by prepublish script
const CORE_VERSION = "__JANT_CORE_VERSION__";

// Template directory resolution:
// - If template/ exists next to dist/ (after prepublish copy), use that
// - Otherwise, use the source templates/jant-site (for local dev)
// From dist/index.js: ../template or ../../../templates/jant-site
const TEMPLATE_DIR = fs.existsSync(path.resolve(__dirname, "../template"))
  ? path.resolve(__dirname, "../template")
  : path.resolve(__dirname, "../../../templates/jant-site");

type PackageManager = "pnpm" | "yarn" | "npm";

interface ProjectConfig {
  projectName: string;
  targetDir: string;
  packageManager: PackageManager;
  install: boolean;
  git: boolean;
  s3?: boolean;
}

/**
 * Validate project name
 */
function isValidProjectName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name);
}

/**
 * Sanitize project name into a valid slug
 */
function toValidProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

/**
 * Generate a secure random AUTH_SECRET (base64, 32 bytes = 44 chars)
 */
function generateAuthSecret(): string {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * Detect which package manager invoked this CLI.
 * Checks npm_config_user_agent first, then falls back to PATH availability.
 */
function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    const name = userAgent.split("/")[0];
    if (name === "pnpm" || name === "yarn" || name === "npm") {
      return name;
    }
  }

  // Fallback: check which PM is available in PATH
  for (const pm of ["pnpm", "yarn", "npm"] as const) {
    try {
      execSync(`${pm} --version`, { stdio: "ignore" });
      return pm;
    } catch {
      // not available
    }
  }

  return "npm";
}

/**
 * Format a run command for the given package manager.
 * npm needs `run` for custom scripts, pnpm/yarn do not.
 */
function formatRunCmd(pm: PackageManager, script: string): string {
  return pm === "npm" ? `npm run ${script}` : `${pm} ${script}`;
}

/**
 * Execute a shell command silently, returning success/failure.
 */
function runCommand(cmd: string, cwd: string): boolean {
  try {
    execSync(cmd, { stdio: "ignore", cwd });
    return true;
  } catch {
    return false;
  }
}

/**
 * Process @create-jant markers in file content.
 *
 * Supported markers (using line comments # or //):
 * - `@create-jant: @remove`         — remove the entire line
 * - `@create-jant: @remove-start/end` — remove the entire block (inclusive)
 * - `@create-jant: "${template}"`   — replace the quoted value before the comment
 *
 * @example
 * // wrangler.toml
 * name = "jant-site" # @create-jant: "${name}"
 * account_id = "abc" # @create-jant: @remove
 *
 * // vite.config.ts
 * // @create-jant: @remove-start
 * "@jant/core": resolve(__dirname, "../../packages/core/src"),
 * // @create-jant: @remove-end
 */
function processMarkers(content: string, vars: Record<string, string>): string {
  // 1. Remove blocks between @remove-start and @remove-end
  content = content.replace(
    /\s*(?:\/\/|#)\s*@create-jant:\s*@remove-start[\s\S]*?(?:\/\/|#)\s*@create-jant:\s*@remove-end\n?/g,
    "",
  );

  // 2. Remove lines with @remove
  content = content.replace(
    /^.*(?:\/\/|#)\s*@create-jant:\s*@remove\s*\n?/gm,
    "",
  );

  // 3. Replace value markers: `key = "old" # @create-jant: "${name}"` → `key = "interpolated"`
  content = content.replace(
    /^(.+=\s*)"[^"]*"\s*(?:\/\/|#)\s*@create-jant:\s*"([^"]*)"/gm,
    (_, prefix: string, template: string) => {
      const value = template.replace(
        /\$\{(\w+)\}/g,
        (__, key: string) => vars[key] ?? "",
      );
      return `${prefix}"${value}"`;
    },
  );

  return content;
}

/**
 * Copy template files to target directory
 */
async function copyTemplate(config: ProjectConfig): Promise<void> {
  const { projectName, targetDir, packageManager } = config;

  // Copy all template files
  await fs.copy(TEMPLATE_DIR, targetDir, {
    filter: (src) => {
      const basename = path.basename(src);
      // Skip system files and development artifacts
      if (basename.startsWith(".DS_Store")) return false;
      if (basename === "node_modules") return false;
      if (basename === ".wrangler") return false;
      if (basename === ".swc") return false;
      if (basename === ".dev.vars") return false;
      if (basename === "pnpm-lock.yaml") return false;
      if (basename === "yarn.lock") return false;
      if (basename === "package-lock.json") return false;
      if (basename === "bun.lockb") return false;
      if (basename === "pnpm-workspace.yaml") return false;
      if (basename === "dist") return false;
      if (basename === "wrangler.demo.toml") return false;
      if (basename === "reset-demo.sql") return false;
      if (basename === "seed-demo.sql") return false;
      if (basename === "reset-local.sql") return false;
      if (basename === "seed-local.sql") return false;
      if (basename === "export-demo.mjs") return false;
      if (basename === "export-seed.mjs") return false;
      return true;
    },
  });

  // Determine secrets file names based on deployment target
  // Cloudflare Workers: .dev.vars.example / .dev.vars
  // Future VPS/Docker: .env.example / .env
  const secretsExampleFile = ".dev.vars.example";
  const secretsFile = ".dev.vars";

  // Rename special files/directories (prefixed with _ to avoid issues)
  const renames: Array<[string, string]> = [
    ["_gitignore", ".gitignore"],
    ["_env.example", secretsExampleFile],
    ["_github", ".github"],
  ];

  for (const [from, to] of renames) {
    const fromPath = path.join(targetDir, from);
    const toPath = path.join(targetDir, to);
    if (await fs.pathExists(fromPath)) {
      await fs.rename(fromPath, toPath);
    }
  }

  // Update package.json with project name and fix dependencies
  const pkgPath = path.join(targetDir, "package.json");
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath);
    pkg.name = projectName;
    // Replace workspace:* with version injected at build time
    if (pkg.dependencies?.["@jant/core"] === "workspace:*") {
      pkg.dependencies["@jant/core"] = `^${CORE_VERSION}`;
    }
    // Adapt for non-pnpm package managers
    if (packageManager !== "pnpm") {
      delete pkg.packageManager;
      if (pkg.scripts) {
        for (const [key, value] of Object.entries(pkg.scripts)) {
          if (typeof value === "string") {
            pkg.scripts[key] = value.replace(
              /pnpm run (\S+)/g,
              (_, script: string) => formatRunCmd(packageManager, script),
            );
          }
        }
      }
    }
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
  }

  // Process @create-jant markers in wrangler.toml
  const wranglerPath = path.join(targetDir, "wrangler.toml");
  if (await fs.pathExists(wranglerPath)) {
    let content = await fs.readFile(wranglerPath, "utf-8");
    content = processMarkers(content, { name: projectName });
    await fs.writeFile(wranglerPath, content, "utf-8");
  }

  // Generate .dev.vars with a secure AUTH_SECRET
  const authSecret = generateAuthSecret();
  let devVarsContent = `# Generated by create-jant
# AUTH_SECRET is used for session encryption (better-auth)
AUTH_SECRET=${authSecret}
`;

  // S3 storage configuration
  if (config.s3) {
    // Uncomment S3 vars and set STORAGE_DRIVER in wrangler.toml
    if (await fs.pathExists(wranglerPath)) {
      let wContent = await fs.readFile(wranglerPath, "utf-8");
      // Uncomment STORAGE_DRIVER and S3 vars
      wContent = wContent.replace(
        /^# STORAGE_DRIVER = "s3"/m,
        'STORAGE_DRIVER = "s3"',
      );
      wContent = wContent.replace(/^# S3_ENDPOINT = /m, "S3_ENDPOINT = ");
      wContent = wContent.replace(/^# S3_BUCKET = /m, "S3_BUCKET = ");
      wContent = wContent.replace(/^# S3_REGION = /m, "S3_REGION = ");
      wContent = wContent.replace(/^# S3_PUBLIC_URL = /m, "S3_PUBLIC_URL = ");
      // Remove [[r2_buckets]] section
      wContent = wContent.replace(/\n\[\[r2_buckets\]\][^[]*/s, "\n");
      await fs.writeFile(wranglerPath, wContent, "utf-8");
    }

    // Add S3 secrets to .dev.vars
    devVarsContent += `
# S3-compatible storage credentials
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
`;
  }

  await fs.writeFile(
    path.join(targetDir, secretsFile),
    devVarsContent,
    "utf-8",
  );

  // Process @create-jant markers in vite.config.ts
  const viteConfigPath = path.join(targetDir, "vite.config.ts");
  if (await fs.pathExists(viteConfigPath)) {
    let content = await fs.readFile(viteConfigPath, "utf-8");
    content = processMarkers(content, {});
    await fs.writeFile(viteConfigPath, content, "utf-8");
  }

  // Copy pnpm-workspace.yaml only for pnpm (contains pnpm-specific onlyBuiltDependencies)
  if (packageManager === "pnpm") {
    const wsSource = path.join(TEMPLATE_DIR, "pnpm-workspace.yaml");
    if (await fs.pathExists(wsSource)) {
      await fs.copy(wsSource, path.join(targetDir, "pnpm-workspace.yaml"));
    }
  }

  // Note: tsconfig.json is already merged during prepublishOnly (prepare-template script)
  // No runtime merging needed - the template/ directory contains a standalone tsconfig.json
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  console.log(); // eslint-disable-line no-console
  p.intro(chalk.bgCyan.black(" create-jant "));

  program
    .name("create-jant")
    .description("Create a new Jant project")
    .argument("[project-name]", "Name of the project")
    .option("-y, --yes", "Skip prompts and use defaults")
    .option("--s3", "Use S3-compatible storage instead of Cloudflare R2")
    .option("--no-install", "Skip dependency installation")
    .option("--no-git", "Skip git initialization")
    .parse();

  const args = program.args;
  const opts = program.opts<{
    yes?: boolean;
    s3?: boolean;
    install: boolean;
    git: boolean;
  }>();

  let projectName: string;

  // Get project name from argument or prompt
  if (args[0]) {
    projectName = args[0];
  } else if (opts.yes) {
    projectName = "jant-site";
  } else {
    const result = await p.text({
      message: "What is your project name?",
      placeholder: "jant-site",
      defaultValue: "jant-site",
      validate: (value) => {
        if (!value) return "Project name is required";
        const sanitized = toValidProjectName(value);
        if (!isValidProjectName(sanitized)) {
          return "Project name must be lowercase alphanumeric with hyphens";
        }
        return undefined;
      },
    });

    if (p.isCancel(result)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    projectName = result as string;
  }

  // Sanitize project name
  if (!isValidProjectName(projectName)) {
    const sanitized = toValidProjectName(projectName);
    p.log.warn(
      `Project name sanitized: ${chalk.yellow(projectName)} -> ${chalk.green(sanitized)}`,
    );
    projectName = sanitized;
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  // Check if directory already exists
  if (await fs.pathExists(targetDir)) {
    const files = await fs.readdir(targetDir);
    if (files.length > 0) {
      if (opts.yes) {
        p.log.error(
          `Directory ${chalk.red(projectName)} already exists and is not empty`,
        );
        process.exit(1);
      }

      const overwrite = await p.confirm({
        message: `Directory ${chalk.yellow(projectName)} already exists and is not empty. Overwrite?`,
        initialValue: false,
      });

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel("Operation cancelled");
        process.exit(0);
      }

      await fs.emptyDir(targetDir);
    }
  }

  const packageManager = detectPackageManager();

  const config: ProjectConfig = {
    projectName,
    targetDir,
    packageManager,
    install: opts.install,
    git: opts.git,
    s3: opts.s3,
  };

  const spinner = p.spinner();
  spinner.start("Creating project...");

  try {
    await copyTemplate(config);
    spinner.stop("Project created successfully!");
  } catch (error) {
    spinner.stop("Failed to create project");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Install dependencies
  let installOk = false;
  if (config.install) {
    spinner.start("Installing dependencies...");
    installOk = runCommand(`${packageManager} install`, targetDir);
    if (installOk) {
      spinner.stop("Dependencies installed.");
    } else {
      spinner.stop(
        chalk.yellow(
          `Failed to install dependencies. Run ${chalk.bold(`${packageManager} install`)} manually.`,
        ),
      );
    }
  }

  // Initialize git repository
  if (config.git) {
    spinner.start("Initializing git repository...");
    const gitOk =
      runCommand("git init", targetDir) &&
      runCommand("git add -A", targetDir) &&
      runCommand('git commit -m "Initial commit"', targetDir);
    if (gitOk) {
      spinner.stop("Git repository initialized.");
    } else {
      spinner.stop("Skipped git initialization.");
    }
  }

  // Show next steps
  const steps: string[] = [`cd ${projectName}`];
  if (!config.install || !installOk) {
    steps.push(`${packageManager} install`);
  }
  steps.push(formatRunCmd(packageManager, "dev"));

  console.log(); // eslint-disable-line no-console
  p.note(steps.join("\n"), "Next steps");

  p.outro(chalk.green("Happy coding!"));
}

main().catch((error) => {
  console.error(chalk.red("Error:"), error); // eslint-disable-line no-console
  process.exit(1);
});
