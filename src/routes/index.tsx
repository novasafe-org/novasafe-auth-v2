import { createFileRoute, redirect } from "@tanstack/react-router";

import { AUTH_PATH } from "@/config";
import { redirectIfAuthenticatedAction } from "@/lib/auth/server-actions";

/**
 * The bare auth domain has no UI of its own — visitors who land here are
 * always trying to sign in. Send them straight to `/login` and forward any
 * `next` / `ref` query parameters along.
 */
export const Route = createFileRoute("/")({
  beforeLoad: async ({ search }) => {
    const { redirectTo } = await redirectIfAuthenticatedAction();
    if (redirectTo) {
      throw redirect({ href: redirectTo, replace: true });
    }
    throw redirect({
      to: AUTH_PATH.Login,
      search: search as Record<string, string>,
      replace: true,
    });
  },
});

