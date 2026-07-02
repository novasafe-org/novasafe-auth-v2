#!/usr/bin/env node
/**
 * Vendors @novasafe/feature-flags from novasafe-backend for local dev and Docker builds.
 * Single source of truth: novasafe-backend/common/feature-flags
 */
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDir = resolve(root, "vendor/feature-flags");
const monorepoCatalog = resolve(root, "../../novasafe-backend/common/feature-flags");

const copyCatalog = (source) => {
  mkdirSync(resolve(root, "vendor"), { recursive: true });
  if (existsSync(vendorDir)) rmSync(vendorDir, { recursive: true, force: true });
  cpSync(source, vendorDir, { recursive: true });
  console.log(`[feature-flags] vendored catalog from ${source}`);
};

if (existsSync(monorepoCatalog)) {
  copyCatalog(monorepoCatalog);
  process.exit(0);
}

if (existsSync(vendorDir)) {
  console.log("[feature-flags] using existing vendor/feature-flags");
  process.exit(0);
}

const repo = process.env.NOVASAFE_BACKEND_REPO ?? "https://github.com/novasafe-org/novasafe-backend.git";
// Catalog ships on the NS-55 epic branch until merged to master; override via NOVASAFE_BACKEND_REF.
const ref = process.env.NOVASAFE_BACKEND_REF ?? "feature/NS-epic-feature-flags";
const tmp = resolve(root, ".tmp-feature-flags-sync");

const cloneArgs = [
  "clone",
  "--depth",
  "1",
  "--filter=blob:none",
  "--sparse",
  ...(ref ? ["--branch", ref] : []),
  repo,
  "repo",
];

try {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  execSync(`git ${cloneArgs.join(" ")}`, {
    cwd: tmp,
    stdio: "inherit",
  });
  execSync("git sparse-checkout set common/feature-flags", { cwd: resolve(tmp, "repo"), stdio: "inherit" });
  copyCatalog(resolve(tmp, "repo/common/feature-flags"));
} catch (error) {
  console.error("[feature-flags] failed to vendor catalog:", error?.message ?? error);
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
