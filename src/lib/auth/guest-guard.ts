import { redirect } from "@tanstack/react-router";

import { redirectIfAuthenticatedAction } from "./server-actions";

/**
 * Auth routes are guest-only. Signed-in users are sent to the app vault.
 */
export async function rejectAuthenticatedVisitors(): Promise<void> {
  const { redirectTo } = await redirectIfAuthenticatedAction();
  if (redirectTo) {
    throw redirect({ href: redirectTo, replace: true });
  }
}
