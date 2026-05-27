import { authConfig } from "@/config";

declare global {
  interface Window {
    __NS_GOOGLE_CLIENT_ID__?: string;
  }
}

/** Google web client id — build-time value with optional runtime override from SSR shell. */
export function getGoogleWebClientId(): string {
  if (typeof window !== "undefined") {
    const runtime = window.__NS_GOOGLE_CLIENT_ID__?.trim();
    if (runtime) return runtime;
  }
  return authConfig.google.webClientId.trim();
}

export function isGoogleSignInEnabled(): boolean {
  return getGoogleWebClientId().length > 0;
}
