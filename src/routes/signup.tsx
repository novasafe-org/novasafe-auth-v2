import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * `/signup` parent layout.
 *
 * The signup space has two distinct surfaces:
 *   - `/signup`      → free signup       (see `signup.index.tsx`)
 *   - `/signup/pro`  → pro signup + paywall (see `signup.pro.tsx`)
 *
 * They share NO component state — only the URL prefix — so this layout is
 * intentionally minimal: a passthrough `<Outlet />` whose only job is to
 * keep TanStack Router's nested-route convention happy. Both children
 * render their own `AuthShell` so visual layout stays consistent without
 * coupling the two flows together.
 */

export const Route = createFileRoute("/signup")({
  ssr: false,
  component: SignupLayoutRoute,
});

function SignupLayoutRoute() {
  return <Outlet />;
}
