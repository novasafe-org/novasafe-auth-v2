import type { FeatureFlagKey } from "./types";

/** Parked product flags — safe production default when API/cache unavailable. */
export const PARKED_PRODUCT_FLAGS: readonly FeatureFlagKey[] = [
  "passkeys",
  "otp",
  "teams",
  "enterprise",
  "sharing_v2",
  "audit_logs",
  "admin_console",
  "browser_extension_v2",
  "activity_logs",
  "scim",
  "sso",
];

export function buildProductionSafeDefaults(): Record<string, boolean> {
  const flags: Record<string, boolean> = {};
  for (const key of PARKED_PRODUCT_FLAGS) {
    flags[key] = false;
  }
  return flags;
}

export function isFlagEnabled(flags: Record<string, boolean>, key: string): boolean {
  return flags[key] === true;
}
