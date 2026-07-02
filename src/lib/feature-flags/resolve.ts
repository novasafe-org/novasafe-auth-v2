import { buildProductionSafeDefaults, isFlagEnabled } from "./defaults";
import { readDevFlagOverride } from "./dev-override";
import { readCachedFeatureFlags } from "./storage";
import type { FeatureFlagSource, FeatureFlagsSnapshot, PlatformFeatureFlagPayload } from "./types";

export function mergeFlagSnapshots(
  base: Record<string, boolean>,
  overlay?: Record<string, boolean> | null,
): Record<string, boolean> {
  if (!overlay) return { ...base };
  return { ...base, ...overlay };
}

export function snapshotFromApiPayload(payload: PlatformFeatureFlagPayload): FeatureFlagsSnapshot {
  return {
    version: payload.version,
    flags: { ...buildProductionSafeDefaults(), ...payload.flags },
  };
}

export function resolveBootstrapSnapshot(
  remote: PlatformFeatureFlagPayload | null,
): { snapshot: FeatureFlagsSnapshot; source: FeatureFlagSource } {
  const devOverride = readDevFlagOverride();
  if (devOverride) {
    return {
      snapshot: {
        version: "dev-override",
        flags: mergeFlagSnapshots(buildProductionSafeDefaults(), devOverride),
      },
      source: "override",
    };
  }

  if (remote) {
    return { snapshot: snapshotFromApiPayload(remote), source: "remote" };
  }

  const cached = readCachedFeatureFlags();
  if (cached) {
    return {
      snapshot: {
        version: cached.version,
        flags: mergeFlagSnapshots(buildProductionSafeDefaults(), cached.flags),
      },
      source: "cache",
    };
  }

  return {
    snapshot: { version: "catalog-defaults", flags: buildProductionSafeDefaults() },
    source: "defaults",
  };
}

export { isFlagEnabled };
