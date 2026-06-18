import { authConfig } from "@/config";

/** Google web client id — runtime server .env with optional build-time fallback. */
export function getGoogleWebClientId(): string {
  if (typeof window !== "undefined") {
    const fromRuntime = window.__NS_PUBLIC_ENV__?.VITE_GOOGLE_WEB_CLIENT_ID?.trim();
    if (fromRuntime) return fromRuntime;
  }
  return authConfig.google.webClientId.trim();
}

export function isGoogleSignInEnabled(): boolean {
  return getGoogleWebClientId().length > 0;
}
