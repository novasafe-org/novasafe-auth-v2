import { env } from "@/config/env";

/** Maps app runtime env to the feature-flag store environment. */
export function resolveFeatureFlagEnvironment(): "production" | "staging" | "development" | "enterprise-dev" {
  switch (env.NODE_ENV) {
    case "production":
      return "production";
    case "staging":
      return "staging";
    case "development":
    case "test":
      return "development";
    default:
      return "production";
  }
}
