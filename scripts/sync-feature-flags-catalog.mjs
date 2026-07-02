#!/usr/bin/env node
/**
 * Vendors @novasafe/feature-flags from novasafe-backend for local dev and Docker builds.
 * Single source of truth: novasafe-backend/common/feature-flags
 */
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = resolve(root, "vendor/feature-flags");
const monorepoCatalog = resolve(root, "../../novasafe-backend/common/feature-flags");
const skipCompile = process.env.SKIP_FEATURE_FLAG_COMPILE === "1";

const copyCatalog = (source) => {
  mkdirSync(resolve(root, "vendor"), { recursive: true });
  if (existsSync(vendorDir)) rmSync(vendorDir, { recursive: true, force: true });
  cpSync(source, vendorDir, { recursive: true });
  console.log(`[feature-flags] vendored catalog from ${source}`);
};

const compileCatalog = () => {
  if (skipCompile) {
    console.log("[feature-flags] skipping catalog compile");
    return;
  }

  const distEntry = resolve(vendorDir, "dist/index.js");
  if (existsSync(distEntry)) {
    console.log("[feature-flags] compiled catalog already present");
    return;
  }

  const standaloneTsconfig = resolve(vendorDir, "tsconfig.build.json");
  writeFileSync(
    standaloneTsconfig,
    JSON.stringify(
      {
        compilerOptions: {
          outDir: "./dist",
          rootDir: ".",
          declaration: true,
          module: "NodeNext",
          moduleResolution: "NodeNext",
          target: "ES2022",
          skipLibCheck: true,
          strict: true,
          types: ["node"],
        },
        include: ["./**/*.ts"],
        exclude: ["./**/*.test.ts", "dist"],
      },
      null,
      2,
    ),
  );

  const compileCommands = [
    "pnpm exec tsc -p tsconfig.build.json",
    "npm install --no-save --no-package-lock typescript@5.8.3 @types/node@22.16.5 && ./node_modules/.bin/tsc -p tsconfig.build.json",
  ];

  for (const command of compileCommands) {
    try {
      execSync(command, { cwd: vendorDir, stdio: "inherit", shell: true });
      if (existsSync(distEntry)) {
        rmSync(resolve(vendorDir, "node_modules"), { recursive: true, force: true });
        console.log("[feature-flags] compiled vendored catalog");
        return;
      }
    } catch {
      // try the next compiler invocation
    }
  }

  throw new Error("[feature-flags] failed to compile vendored catalog");
};

const finish = () => {
  compileCatalog();
};

if (existsSync(monorepoCatalog)) {
  copyCatalog(monorepoCatalog);
  finish();
  process.exit(0);
}

if (existsSync(vendorDir)) {
  console.log("[feature-flags] using existing vendor/feature-flags");
  finish();
  process.exit(0);
}

const repo = process.env.NOVASAFE_BACKEND_REPO ?? "https://github.com/novasafe-org/novasafe-backend.git";
const ref = process.env.NOVASAFE_BACKEND_REF ?? "master";
const tmp = resolve(root, ".tmp-feature-flags-sync");

try {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  execSync(`git clone --depth 1 --branch ${ref} --filter=blob:none --sparse ${repo} repo`, {
    cwd: tmp,
    stdio: "inherit",
  });
  execSync("git sparse-checkout set common/feature-flags", { cwd: resolve(tmp, "repo"), stdio: "inherit" });
  copyCatalog(resolve(tmp, "repo/common/feature-flags"));
  finish();
} catch (error) {
  console.error("[feature-flags] failed to vendor catalog:", error?.message ?? error);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
