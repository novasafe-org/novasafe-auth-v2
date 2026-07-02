import type { FeatureFlagsSnapshot } from "./types";

const STORAGE_KEY = "novasafe:feature-flags:v1";

export function readCachedFeatureFlags(): FeatureFlagsSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FeatureFlagsSnapshot;
    if (!parsed?.version || !parsed.flags || typeof parsed.flags !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedFeatureFlags(snapshot: FeatureFlagsSnapshot): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }
}

export function clearCachedFeatureFlags(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
