import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { ExtensionPairingFailureCard } from "@/components/auth/screens/ExtensionPairingFailureCard";
import { extensionPairingLog } from "@/lib/auth/extension-pairing.constants";
import {
  buildConnectExtensionReturnUrl,
  restoreExtensionPairingContext,
} from "@/lib/auth/extension-pairing-context";

const failureSearchSchema = z.object({
  message: z.string().default("Could not connect the extension. Please try again."),
  code: z.string().optional(),
  timedOut: z.boolean().optional(),
  installId: z.string().optional(),
  redirect_uri: z.string().optional(),
  state: z.string().optional(),
});

export const Route = createFileRoute("/connect/extension/failure")({
  ssr: false,
  validateSearch: (search) => failureSearchSchema.parse(search ?? {}),
  head: () => ({
    meta: [
      { title: "Extension Pairing Failed — NovaSafe" },
      {
        name: "description",
        content: "Could not connect the NovaSafe browser extension. Please try again.",
      },
    ],
  }),
  component: ConnectExtensionFailureRoute,
});

function ConnectExtensionFailureRoute() {
  const search = Route.useSearch();

  extensionPairingLog("Failure Redirect", { code: search.code, message: search.message });

  const retryHref = (() => {
    if (search.installId && search.redirect_uri && search.state) {
      return buildConnectExtensionReturnUrl({
        installId: search.installId,
        redirect_uri: search.redirect_uri,
        state: search.state,
      });
    }
    const restored = restoreExtensionPairingContext();
    return restored ? buildConnectExtensionReturnUrl(restored) : undefined;
  })();

  return (
    <AuthShell
      kicker="Browser extension"
      headline="Connection interrupted."
      topBarAction={null}
    >
      <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-sm">
        <ExtensionPairingFailureCard
          message={search.message}
          code={search.code}
          retryHref={retryHref}
          timedOut={search.timedOut}
        />
      </div>
    </AuthShell>
  );
}
