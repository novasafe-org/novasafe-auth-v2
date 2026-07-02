import { createServerFn } from "@tanstack/react-start";

import { apiFetch } from "@/lib/api/http";
import { readSessionToken } from "@/lib/auth/session.server";

import type { PlatformFeatureFlagPayload } from "./types";

type FeatureFlagsApiResponse = {
  success: boolean;
  data?: PlatformFeatureFlagPayload;
};

/** Authenticated fetch against mobile-api read-only feature flags endpoint. */
export const fetchPlatformFeatureFlagsAction = createServerFn({ method: "GET" }).handler(
  async (): Promise<PlatformFeatureFlagPayload | null> => {
    const token = readSessionToken();
    if (!token) return null;

    try {
      const response = await apiFetch<FeatureFlagsApiResponse>("/api/v1/platform/feature-flags", {
        method: "GET",
        token,
      });
      return response.data ?? null;
    } catch {
      return null;
    }
  },
);
