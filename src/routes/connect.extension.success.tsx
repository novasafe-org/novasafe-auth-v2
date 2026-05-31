import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { ExtensionPairingSuccessCard } from "@/components/auth/screens/ExtensionPairingSuccessCard";
import {
  EXTENSION_PAIRING_REDIRECT_KEY,
  extensionPairingLog,
} from "@/lib/auth/extension-pairing.constants";

export const Route = createFileRoute("/connect/extension/success")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Extension Connected — NovaSafe" },
      {
        name: "description",
        content: "Your NovaSafe browser extension was connected successfully.",
      },
    ],
  }),
  component: ConnectExtensionSuccessRoute,
});

function ConnectExtensionSuccessRoute() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"handoff" | "success">("handoff");

  useEffect(() => {
    const extensionRedirectTo = sessionStorage.getItem(EXTENSION_PAIRING_REDIRECT_KEY);
    if (!extensionRedirectTo) {
      extensionPairingLog("Failure Redirect", { reason: "missing_handoff" });
      void navigate({
        to: "/connect/extension/failure",
        search: {
          message: "Pairing session expired. Please try connecting again.",
          code: "handoff_missing",
        },
        replace: true,
      });
      return;
    }

    sessionStorage.removeItem(EXTENSION_PAIRING_REDIRECT_KEY);
    extensionPairingLog("Success Redirect", { host: new URL(extensionRedirectTo).hostname });

    try {
      window.location.replace(extensionRedirectTo);
    } catch (error) {
      extensionPairingLog("Failure Redirect", { reason: "handoff_failed", error });
      void navigate({
        to: "/connect/extension/failure",
        search: {
          message: "Could not complete the extension handoff. Try pairing again.",
          code: "handoff_failed",
        },
        replace: true,
      });
      return;
    }

    const successTimer = window.setTimeout(() => {
      extensionPairingLog("Extension Confirmed", { mode: "success_page_visible" });
      setPhase("success");
    }, 1800);

    return () => window.clearTimeout(successTimer);
  }, [navigate]);

  return (
    <AuthShell
      kicker="Browser extension"
      headline="Almost there."
      topBarAction={null}
    >
      <div className="mx-auto w-full max-w-[480px] rounded-2xl border border-border bg-card p-6 shadow-sm">
        <ExtensionPairingSuccessCard phase={phase} />
      </div>
    </AuthShell>
  );
}
