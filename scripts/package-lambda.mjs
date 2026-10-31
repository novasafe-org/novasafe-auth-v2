#!/usr/bin/env node
/**
 * Package NovaSafe Auth for AWS Lambda (zip, no ECR).
 *
 * Usage:
 *   node scripts/package-lambda.mjs --env-file /path/to/.env
 *   node scripts/package-lambda.mjs --env-file /path/to/.env --output dist/lambda.zip
 */
import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function applyEnvFile(envFilePath) {
  const text = readFileSync(envFilePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const withoutExport = trimmed.startsWith("export ")
      ? trimmed.slice("export ".length).trim()
      : trimmed;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    let value = withoutExport.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const parseArgs = () => {
  const args = process.argv.slice(2);
  let output = join(repoRoot, "dist/lambda.zip");
  let envFile;

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--output") {
      output = resolve(args[++i]);
    } else if (args[i] === "--env-file") {
      envFile = resolve(args[++i]);
    } else {
      console.error(`Unknown argument: ${args[i]}`);
      process.exit(1);
    }
  }

  if (!envFile) {
    console.error("Missing --env-file (merged production .env for Lambda)");
    process.exit(1);
  }
  if (!existsSync(envFile)) {
    console.error(`::error::Env file not found: ${envFile}`);
    process.exit(1);
  }

  return { output, envFile };
};

const run = (command, options = {}) => {
  console.log(`[lambda-package] $ ${command}`);
  execSync(command, { stdio: "inherit", ...options });
};

const assertPackage = (packageDir) => {
  const required = [
    join(packageDir, "dist/runtimes/lambda.mjs"),
    join(packageDir, "dist/runtimes/load-bundled-env.mjs"),
    join(packageDir, "dist/server/server.js"),
    join(packageDir, "dist/client"),
    join(packageDir, "package.json"),
    join(packageDir, ".env"),
  ];

  for (const filePath of required) {
    if (!existsSync(filePath)) {
      console.error(`::error::Lambda package missing: ${filePath}`);
      process.exit(1);
    }
  }

  if (existsSync(join(packageDir, "node_modules"))) {
    console.error("::error::Lambda package must not include node_modules");
    process.exit(1);
  }

  const zipBytes = execSync(`du -sb "${packageDir}" | cut -f1`, { encoding: "utf8" }).trim();
  console.log(`[lambda-package] staged package size: ${(Number(zipBytes) / 1024 / 1024).toFixed(2)} MB`);
};

const { output, envFile } = parseArgs();
applyEnvFile(envFile);

const stageDir = mkdtempSync(join(tmpdir(), "novasafe-auth-lambda-"));
const packageDir = join(stageDir, "package");

try {
  run("pnpm build", { cwd: repoRoot, env: { ...process.env } });

  mkdirSync(join(packageDir, "dist/runtimes"), { recursive: true });
  cpSync(join(repoRoot, "dist/client"), join(packageDir, "dist/client"), { recursive: true });
  cpSync(join(repoRoot, "dist/server"), join(packageDir, "dist/server"), { recursive: true });
  cpSync(join(repoRoot, "bin/lambda.mjs"), join(packageDir, "dist/runtimes/lambda.mjs"));
  cpSync(join(repoRoot, "bin/load-bundled-env.mjs"), join(packageDir, "dist/runtimes/load-bundled-env.mjs"));
  writeFileSync(join(packageDir, ".env"), readFileSync(envFile, "utf8"), "utf8");
  writeFileSync(join(packageDir, "package.json"), JSON.stringify({ type: "module" }, null, 2));

  assertPackage(packageDir);

  mkdirSync(dirname(output), { recursive: true });
  rmSync(output, { force: true });
  run(`cd "${packageDir}" && zip -qr "${output}" .`);

  const zipSize = statSync(output).size;
  if (zipSize > 50 * 1024 * 1024) {
    console.error(`::error::Lambda zip is ${(zipSize / 1024 / 1024).toFixed(2)} MB — limit is 50 MB (direct upload)`);
    process.exit(1);
  }

  console.log(`[lambda-package] auth → ${output} (${(zipSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log("[lambda-package] handler: dist/runtimes/lambda.handler");
} finally {
  rmSync(stageDir, { recursive: true, force: true });
}
