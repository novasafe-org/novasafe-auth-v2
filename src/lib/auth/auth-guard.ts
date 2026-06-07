import { redirect } from "@tanstack/react-router";

import { buildLoginUrl, buildManageBillingUrl, buildUpgradeUrl } from "@/config";
import { loadManageBillingSessionAction, loadUpgradeSessionAction } from "./server-actions";

/**
 * Upgrade routes require an authenticated session. Guests are sent to login
 * with a `next` parameter that returns them to `/upgrade` after sign-in.
 */
export async function requireAuthenticatedForUpgrade(options?: {
  next?: string;
  ref?: string;
}): Promise<{ user: { id: string; email: string; name?: string }; returnTo: string }> {
  const upgradeReturn = buildUpgradeUrl({
    next: options?.next,
    ref: options?.ref,
  });

  const result = await loadUpgradeSessionAction({ data: { next: options?.next ?? null } });

  if (result.status === "unauthorized") {
    throw redirect({
      href: buildLoginUrl({ next: upgradeReturn }),
      replace: true,
    });
  }

  if (result.status === "already-pro") {
    throw redirect({ href: result.redirectTo, replace: true });
  }

  return {
    user: result.user,
    returnTo: result.returnTo,
  };
}

/** Opens the provider-managed portal — requires auth and subscription history. */
export async function requireAuthenticatedForManageBilling(options?: {
  next?: string;
  ref?: string;
}): Promise<{ user: { id: string; email: string; name?: string }; returnTo: string }> {
  const manageReturn = buildManageBillingUrl({
    next: options?.next,
    ref: options?.ref,
  });

  const result = await loadManageBillingSessionAction({ data: { next: options?.next ?? null } });

  if (result.status === "unauthorized") {
    throw redirect({
      href: buildLoginUrl({ next: manageReturn }),
      replace: true,
    });
  }

  if (result.status === "no-subscription") {
    throw redirect({ href: result.redirectTo, replace: true });
  }

  return {
    user: result.user,
    returnTo: result.returnTo,
  };
}
