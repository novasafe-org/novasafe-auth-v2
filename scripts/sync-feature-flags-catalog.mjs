#!/usr/bin/env node
/**
 * Vendors @novasafe/feature-flags from novasafe-backend for local dev and Docker builds.
 * Single source of truth: novasafe-backend/common/feature-flags
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = resolve(root, "vendor/feature-flags");
const monorepoCatalog = resolve(root, "../../novasafe-backend/common/feature-flags");
const forceRevendor = process.env.FORCE_FEATURE_FLAG_REVENDOR === "1";

const copyCatalog = (source) => {
  mkdirSync(resolve(root, "vendor"), { recursive: true });
  if (existsSync(vendorDir)) rmSync(vendorDir, { recursive: true, force: true });
  cpSync(source, vendorDir, { recursive: true });
  console.log(`[feature-flags] vendored catalog from ${source}`);
  patchPackageExports();
};

const patchPackageExports = () => {
  const packageJsonPath = resolve(vendorDir, "package.json");
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  pkg.main = "./index.ts";
  pkg.types = "./index.ts";
  pkg.exports = {
    ".": {
      types: "./index.ts",
      import: "./index.ts",
      default: "./index.ts",
    },
  };
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("[feature-flags] patched package exports for Vite bundling");
};

const vendorFromGit = () => {
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
    execSync("git sparse-checkout set common/feature-flags", {
      cwd: resolve(tmp, "repo"),
      stdio: "inherit",
    });
    copyCatalog(resolve(tmp, "repo/common/feature-flags"));
  } catch (error) {
    console.error("[feature-flags] failed to vendor catalog:", error?.message ?? error);
    process.exit(1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

if (forceRevendor) {
  vendorFromGit();
  process.exit(0);
}

if (existsSync(monorepoCatalog)) {
  copyCatalog(monorepoCatalog);
  process.exit(0);
}

if (existsSync(vendorDir)) {
  console.log("[feature-flags] using existing vendor/feature-flags");
  process.exit(0);
}

vendorFromGit();
