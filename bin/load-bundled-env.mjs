/**
 * Load `.env` bundled at the Lambda package root (same layout as backend services).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseEnvLines(text) {
  const entries = [];
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
    entries.push([key, value]);
  }
  return entries;
}

export function loadBundledEnv() {
  const runtimeDir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(runtimeDir, "../../.env");
  if (!existsSync(envPath)) {
    console.warn("[load-env] no bundled .env at", envPath);
    return;
  }
  const entries = parseEnvLines(readFileSync(envPath, "utf8"));
  for (const [key, value] of entries) {
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}
