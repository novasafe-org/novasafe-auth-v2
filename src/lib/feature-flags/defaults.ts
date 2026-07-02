import {
  buildDefaultFeatureFlagSnapshot,
  FEATURE_FLAG_CATALOG_VERSION,
  type FeatureFlagKey,
} from "@novasafe/feature-flags";

export type { FeatureFlagKey };

/** Offline / first-load defaults — derived from backend catalog (production). */
export function buildProductionSafeDefaults(): Record<string, boolean> {
  return { ...buildDefaultFeatureFlagSnapshot("production").flags };
}

export function isFlagEnabled(flags: Record<string, boolean>, key: string): boolean {
  return flags[key] === true;
}

export { FEATURE_FLAG_CATALOG_VERSION };
