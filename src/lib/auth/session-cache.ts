import type { AuthUser } from "@/lib/api";
import { runtime } from "@/config";

/**
 * In-memory session cache, mirrored across the same tab.
 *
 * The canonical session lives in an HttpOnly cookie that the browser cannot
 * read. For client-side flows that need the user during the same tab
 * session (OAuth-pending OTP, paywall, post-login navigation) we keep an
 * in-memory mirror that is hydrated from:
 *
 *   1. Server-rendered initial state (preferred — set during SSR).
 *   2. A fresh login response (set explicitly after `authApi.login`).
 *
 * The cache is intentionally NOT persisted to localStorage; the cookie is
 * the source of truth across reloads. We only mirror in-tab.
 *
 * NOTE: this module is isomorphic — it can be imported in server code
 * because all operations are pure JS (no DOM/window access). Per-request
 * memory on the server is discarded after the request completes; that's
 * fine because the canonical state is the cookie.
 */

interface ClientSession {
  token: string;
  user: AuthUser;
  pending: boolean;
  pendingProvider?: "google" | "apple";
}

let memorySession: ClientSession | null = null;

const listeners = new Set<(session: ClientSession | null) => void>();

function notify(): void {
  for (const listener of listeners) listener(memorySession);
}

export function setClientSession(session: ClientSession | null): void {
  memorySession = session ? { ...session } : null;
  notify();
}

export function getClientSession(): ClientSession | null {
  return memorySession;
}

export function clearClientSession(): void {
  if (memorySession === null) return;
  memorySession = null;
  notify();
}

/** Subscribe to session changes (returns an unsubscribe function). */
export function subscribeToClientSession(
  listener: (session: ClientSession | null) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Throws on the server — guard against accidental usage from SSR code paths. */
export function assertBrowserSessionContext(): void {
  if (!runtime.isBrowser) {
    throw new Error(
      "[novasafe-auth] session-cache browser-only helpers were called from a server context.",
    );
  }
}

export type { ClientSession };
