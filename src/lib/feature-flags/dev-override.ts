const DEV_OVERRIDE_KEY = "novasafe:feature-flags:dev-override";

/** Local dev override — never used in production builds. */
export function readDevFlagOverride(): Record<string, boolean> | null {
  if (!import.meta.env.DEV || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
