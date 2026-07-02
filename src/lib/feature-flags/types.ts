/** Catalog keys used for client UI gating (subset — unknown keys default false). */
export type FeatureFlagKey =
  | "passkeys"
  | "otp"
  | "teams"
  | "enterprise"
  | "sharing_v2"
  | "audit_logs"
  | "admin_console"
  | "browser_extension_v2"
  | "activity_logs"
  | "scim"
  | "sso";

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
