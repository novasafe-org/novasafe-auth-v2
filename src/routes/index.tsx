import { createFileRoute, redirect } from "@tanstack/react-router";

import { AUTH_PATH } from "@/config";

/**
 * The bare auth domain has no UI of its own — visitors who land here are
 * always trying to sign in. Send them straight to `/login` and forward any
 * `next` / `ref` query parameters along.
 */
export const Route = createFileRoute("/")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: AUTH_PATH.Login,
      search: search as Record<string, string>,
      replace: true,
    });
  },
});

