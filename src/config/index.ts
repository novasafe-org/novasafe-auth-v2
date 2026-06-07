/**
 * Single import surface for browser-safe configuration.
 * Server-only configs live in `*.server.ts` modules and must be imported
 * directly (e.g. `import { authServerConfig } from "@/config/auth.server"`).
 */

export { env, runtime, readEnv } from "./env";
export type { PublicEnv } from "./env";

export { appConfig } from "./app.config";
export type { AppConfig } from "./app.config";

export { AUTH_PATH, authConfig, isAuthPath, type AuthPath, type AuthConfig } from "./auth.config";

export {
  billingConfig,
  billingPackageCandidates,
  type BillingCycle,
  type BillingConfig,
} from "./billing.config";

export {
  ROUTES,
  buildLoginUrl,
  buildSignupUrl,
  buildSignupProUrl,
  buildProUrl,
  buildUpgradeUrl,
  buildManageBillingUrl,
  buildAppUrl,
  buildLandingUrl,
  resolvePostAuthRedirect,
  type Routes,
  type BuildOptions,
} from "./routes.config";
