import { createServerFn } from "@tanstack/react-start";

import { apiFetch } from "@/lib/api/http";
import { readSessionToken } from "@/lib/auth/session.server";

import { resolveFeatureFlagEnvironment } from "./environment";
import type { PlatformFeatureFlagPayload } from "./types";

type FeatureFlagsApiResponse = {
  success: boolean;
  data?: PlatformFeatureFlagPayload;
};

/** Loads feature flags from mobile-api (authenticated or public endpoint). */
export const fetchPlatformFeatureFlagsAction = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformFeatureFlagPayload | null> => {
    const token = readSessionToken();
    const environment = resolveFeatureFlagEnvironment();
    const path = token ? "/api/v1/platform/feature-flags" : "/api/v1/platform/feature-flags/public";

    try {
      const response = await apiFetch<FeatureFlagsApiResponse>(path, {
        method: "GET",
        query: { environment },
        token: token ?? undefined,
      });
      return response.data ?? null;
    } catch (error) {
      console.error("[feature-flags] Failed to load platform flags", error);
      return null;
    }
  },
);
