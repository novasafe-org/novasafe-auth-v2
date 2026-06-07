import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { requireAuthenticatedForManageBilling } from "@/lib/auth/auth-guard";
import { NovaLogo } from "@/components/novasafe/visuals";
import { env } from "@/config/env";

const manageSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

function billingReturnUrl(returnTo: string): string {
  try {
    const url = new URL(returnTo);
    if (url.pathname.includes("/account/billing")) return returnTo;
  } catch {
    // fall through
  }
  return `${env.APP_URL.replace(/\/$/, "")}/account/billing`;
}

function redirectToBillingWithPortalError(billingUrl: string): void {
  const url = new URL(billingUrl);
  url.searchParams.set("portalError", "1");
  window.location.replace(url.toString());
}

export const Route = createFileRoute("/billing/manage")({
  validateSearch: (search) => manageSearchSchema.parse(search),
  loader: async ({ location }) => {
    const search = manageSearchSchema.parse(location.search);
    return requireAuthenticatedForManageBilling({
      next: search.next,
      ref: search.ref,
    });
  },
  head: () => ({
    meta: [{ title: "Manage Subscription — NovaSafe" }],
  }),
  component: ManageBillingRoute,
});

function ManageBillingRoute() {
  const { user, returnTo } = Route.useLoaderData();
  const billingUrl = billingReturnUrl(returnTo);
  const redirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { billingClient } = await import("@/lib/billing/client");
      if (cancelled || redirectedRef.current) return;

      if (!billingClient.isEnabled()) {
        redirectedRef.current = true;
        redirectToBillingWithPortalError(billingUrl);
        return;
      }

      const outcome = await billingClient.getManagementUrl(user.id);
      if (cancelled || redirectedRef.current) return;

      if (outcome.status === "ready") {
        redirectedRef.current = true;
        window.location.replace(outcome.url);
        return;
      }

      redirectedRef.current = true;
      redirectToBillingWithPortalError(billingUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id, billingUrl]);

  return <ManageRedirectShell />;
}

/** Transient loading shell — users should only see this briefly before redirect. */
function ManageRedirectShell() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      const saved = localStorage.getItem("nv-theme");
      document.documentElement.classList.toggle("dark", saved === "dark");
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-4 py-8 sm:px-6">
        <NovaLogo />
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">Opening your billing portal…</p>
        </div>
      </div>
    </div>
  );
}
