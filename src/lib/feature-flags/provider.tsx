import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isFlagEnabled, resolveBootstrapSnapshot } from "./resolve";
import { fetchPlatformFeatureFlagsAction } from "./server-actions";
import { writeCachedFeatureFlags } from "./storage";
import type { FeatureFlagKey, FeatureFlagsContextValue } from "./types";

const FeatureFlagsContext = createContext<FeatureFlagsContextValue | null>(null);

const REFRESH_INTERVAL_MS = 60_000;

export type FeatureFlagsProviderProps = {
  children: ReactNode;
  /** @deprecated Remote flags are always loaded when a session or public endpoint is available. */
  authenticated?: boolean;
};

export function FeatureFlagsProvider({ children }: FeatureFlagsProviderProps) {
  const [value, setValue] = useState<FeatureFlagsContextValue>(() => {
    const boot = resolveBootstrapSnapshot(null);
    return {
      version: boot.snapshot.version,
      flags: boot.snapshot.flags,
      source: boot.source,
      loading: true,
      error: null,
      refresh: async () => {},
    };
  });

  const refresh = useCallback(async () => {
    setValue((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const remote = await fetchPlatformFeatureFlagsAction();
      const boot = resolveBootstrapSnapshot(remote);
      writeCachedFeatureFlags(boot.snapshot);
      setValue((prev) => ({
        ...prev,
        version: boot.snapshot.version,
        flags: boot.snapshot.flags,
        source: boot.source,
        loading: false,
        error: null,
      }));
    } catch (err) {
      const boot = resolveBootstrapSnapshot(null);
      setValue((prev) => ({
        ...prev,
        version: boot.snapshot.version,
        flags: boot.snapshot.flags,
        source: boot.source,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load feature flags",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const contextValue = useMemo<FeatureFlagsContextValue>(
    () => ({
      ...value,
      refresh,
    }),
    [value, refresh],
  );

  return <FeatureFlagsContext.Provider value={contextValue}>{children}</FeatureFlagsContext.Provider>;
}

export function useFeatureFlags(): FeatureFlagsContextValue {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) {
    throw new Error("useFeatureFlags must be used within FeatureFlagsProvider");
  }
  return ctx;
}

export function useFeatureFlag(key: FeatureFlagKey | string): boolean {
  const { flags } = useFeatureFlags();
  return isFlagEnabled(flags, key);
}
