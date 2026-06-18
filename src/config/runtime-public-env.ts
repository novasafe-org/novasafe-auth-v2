/**
 * Serialize validated public env for browser hydration.
 * SSR reads process.env (server .env); the script runs before client bundles load.
 */
import type { PublicEnv } from "./env";

export function buildBrowserRuntimeEnvScript(env: PublicEnv): string {
  const payload: Record<string, string> = {
    VITE_AUTH_URL: env.AUTH_URL,
    VITE_LANDING_URL: env.LANDING_URL,
    VITE_APP_URL: env.APP_URL,
    VITE_API_URL: env.API_URL,
    VITE_GOOGLE_WEB_CLIENT_ID: env.GOOGLE_WEB_CLIENT_ID,
    VITE_REVENUECAT_PUBLIC_API_KEY_WEB: env.REVENUECAT_PUBLIC_API_KEY_WEB,
    VITE_REVENUECAT_ENTITLEMENT_PRO: env.REVENUECAT_ENTITLEMENT_PRO,
    VITE_REVENUECAT_PACKAGE_MONTHLY: env.REVENUECAT_PACKAGE_MONTHLY,
    VITE_REVENUECAT_PACKAGE_YEARLY: env.REVENUECAT_PACKAGE_YEARLY,
    VITE_APP_VERSION: env.APP_VERSION,
  };

  return `window.__NS_PUBLIC_ENV__=${JSON.stringify(payload)};`;
}
