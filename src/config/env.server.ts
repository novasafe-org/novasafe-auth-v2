import { z } from "zod";
import { readEnv, runtime } from "./env";

/**
 * Server-only environment.
 *
 * The `.server.ts` suffix tells TanStack Start / Vite to exclude this module
 * from the client bundle. Importing it from any browser-reachable code path
 * is a build error — by design.
 *
 * Use this file for anything the browser must never see (cookie policy,
 * API server-side secrets, OAuth client secrets, etc.).
 */

if (runtime.isBrowser) {
  throw new Error(
    "[novasafe-auth] env.server.ts was imported from a browser context. " +
      "Move the call into a server function or a *.server.ts module.",
  );
}

const TRUE_TOKENS = new Set(["true", "1", "yes", "on"]);

const boolFlag = z.union([z.string(), z.boolean(), z.undefined()]).transform((v) => {
  if (typeof v === "boolean") return v;
  if (v === undefined || v === "") return false;
  return TRUE_TOKENS.has(String(v).toLowerCase());
});

const positiveInt = (fallback: number) =>
  z.union([z.string(), z.number(), z.undefined()]).transform((v) => {
    if (v === undefined || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  });

const ServerEnvSchema = z.object({
  AUTH_COOKIE_NAME: z.string().min(1).default("ns_session"),
  /**
   * Empty string = host-only cookie (correct for localhost).
   * Production: ".novasafe.io" (leading dot is required for true wildcard
   * subdomain support across all browsers).
   */
  AUTH_COOKIE_DOMAIN: z.string().default(""),
  AUTH_COOKIE_SECURE: boolFlag,
  AUTH_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  AUTH_COOKIE_MAX_AGE: positiveInt(60 * 60 * 24 * 7),
  AUTH_COOKIE_PATH: z.string().min(1).default("/"),
});

const raw = {
  AUTH_COOKIE_NAME: readEnv("AUTH_COOKIE_NAME"),
  AUTH_COOKIE_DOMAIN: readEnv("AUTH_COOKIE_DOMAIN"),
  AUTH_COOKIE_SECURE: readEnv("AUTH_COOKIE_SECURE"),
  AUTH_COOKIE_SAMESITE: readEnv("AUTH_COOKIE_SAMESITE"),
  AUTH_COOKIE_MAX_AGE: readEnv("AUTH_COOKIE_MAX_AGE"),
  AUTH_COOKIE_PATH: readEnv("AUTH_COOKIE_PATH"),
};

let parsed: z.infer<typeof ServerEnvSchema>;
try {
  parsed = ServerEnvSchema.parse(raw);
} catch (err) {
  if (err instanceof z.ZodError) {
    const lines = err.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`[novasafe-auth] Invalid server environment configuration:\n${lines}`);
  }
  throw err;
}

export const serverEnv = Object.freeze(parsed);
export type ServerEnv = typeof serverEnv;
