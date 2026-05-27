/**
 * Billing barrel.
 *
 * Server actions are isomorphic re-exports (safe in both bundles).
 * `client.ts` is browser-only and is intentionally NOT re-exported here —
 * the paywall imports it directly so the lazy SDK chunk only ever loads in
 * the browser. Importing this barrel from a server file is therefore safe.
 */

export type {
  PaywallCycle,
  PaywallPlan,
  PaywallOfferings,
  SubscriptionSnapshot,
  SubscriptionTier,
} from "./types";

export {
  confirmProEntitlementAction,
  loadSubscriptionStateAction,
  type ConfirmEntitlementResult,
} from "./server-actions";
