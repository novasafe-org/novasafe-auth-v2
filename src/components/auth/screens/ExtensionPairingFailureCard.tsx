import { AlertCircle, ArrowRight, RefreshCw } from "lucide-react";

import { PrimaryButton, Section, Title } from "@/components/auth/primitives";
import { buildAppUrl, buildLoginUrl, buildSignupProUrl } from "@/config";

const DEVICE_LIMIT_CODE = "NOVASAFE_DEVICE_LIMIT";

interface ExtensionPairingFailureCardProps {
  message: string;
  code?: string;
  retryHref?: string;
  timedOut?: boolean;
}

export function ExtensionPairingFailureCard({
  message,
  code,
  retryHref,
  timedOut,
}: ExtensionPairingFailureCardProps) {
  const isDeviceLimit = code === DEVICE_LIMIT_CODE;
  const title = timedOut
    ? "Unable to connect extension"
    : isDeviceLimit
      ? "Device limit reached"
      : "Pairing failed";
  const showRetry = Boolean(retryHref) && !isDeviceLimit;

  return (
    <Section>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-7 w-7" />
      </div>

      <Title
        eyebrow="Extension pairing"
        title={title}
        sub={message}
      />

      {code ? (
        <p className="text-center font-mono text-[11px] text-muted-foreground">Code: {code}</p>
      ) : null}

      <div className="space-y-3">
        {isDeviceLimit ? (
          <PrimaryButton type="button" onClick={() => window.location.assign(buildSignupProUrl())}>
            Upgrade to NovaSafe Pro
          </PrimaryButton>
        ) : null}

        {showRetry ? (
          <PrimaryButton type="button" onClick={() => window.location.assign(retryHref!)}>
            <RefreshCw className="h-4 w-4" /> Retry pairing
          </PrimaryButton>
        ) : null}

        <a
          href={buildLoginUrl()}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-[14px] font-semibold text-foreground transition hover:bg-surface-2"
        >
          Return to login <ArrowRight className="h-4 w-4" />
        </a>

        <a
          href={buildAppUrl()}
          className="block text-center text-[12px] text-muted-foreground underline-offset-2 hover:underline"
        >
          Go to NovaSafe web app
        </a>
      </div>
    </Section>
  );
}
