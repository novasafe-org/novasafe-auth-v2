import { redirect } from "@tanstack/react-router";

import { buildAppUrl, resolvePostAuthRedirect } from "@/config";
import { redirectIfAuthenticatedAction } from "./server-actions";

/**
 * Auth routes are guest-only. Signed-in users are sent to the app vault,
 * or to a validated `next` target (e.g. extension pairing after login).
 */
export async function rejectAuthenticatedVisitors(next?: string): Promise<void> {
  const { redirectTo } = await redirectIfAuthenticatedAction({ data: { next: next ?? null } });
  if (redirectTo) {
    throw redirect({ href: redirectTo, replace: true });
  }
}
