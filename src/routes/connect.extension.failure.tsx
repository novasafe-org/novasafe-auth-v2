import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthShell } from "@/components/auth/AuthShell";
import { ExtensionPairingFailureCard } from "@/components/auth/screens/ExtensionPairingFailureCard";
import { extensionPairingLog } from "@/lib/auth/extension-pairing.constants";

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
  validateSearch: (search) => failureSearchSchema.parse(search),
  head: ({ search }) => ({
    meta: [
      { title: "Extension Pairing Failed — NovaSafe" },
      {
        name: "description",
        content: search.message,
      },
    ],
  }),
  component: ConnectExtensionFailureRoute,
});

function ConnectExtensionFailureRoute() {
  const search = Route.useSearch();

  extensionPairingLog("Failure Redirect", { code: search.code, message: search.message });

  const retryHref =
    search.installId && search.redirect_uri && search.state
      ? `/connect/extension?installId=${encodeURIComponent(search.installId)}&redirect_uri=${encodeURIComponent(search.redirect_uri)}&state=${encodeURIComponent(search.state)}`
      : undefined;

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
