export type { FeatureFlagKey } from "@novasafe/feature-flags";

export interface PlatformFeatureFlagPayload {
  version: string;
  storeVersion?: number;
  environment?: string;
  flags: Record<string, boolean>;
  capabilities?: string[];
}

export interface FeatureFlagsSnapshot {
  version: string;
  flags: Record<string, boolean>;
}

export type FeatureFlagSource = "remote" | "cache" | "defaults" | "override";

export interface FeatureFlagsContextValue {
  version: string;
  flags: Record<string, boolean>;
  source: FeatureFlagSource;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
