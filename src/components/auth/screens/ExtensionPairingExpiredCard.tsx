import { AlertCircle, Puzzle } from "lucide-react";

import { Section, Title } from "@/components/auth/primitives";
import { buildAppUrl } from "@/config";

export function ExtensionPairingExpiredCard() {
  return (
    <Section>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Puzzle className="h-7 w-7" />
      </div>

      <Title
        eyebrow="Extension pairing"
        title="Pairing session expired"
        sub="Extension pairing session expired. Please return to the extension and try again."
      />

      <p className="flex items-start justify-center gap-2 text-center text-[12px] text-muted-foreground">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
        <span>
          We could not find a valid pairing request. This can happen after a long delay, if the login tab was
          closed, or if the browser cleared temporary data.
        </span>
      </p>

      <div className="space-y-3">
        <p className="text-center text-[12px] text-muted-foreground">
          Open the NovaSafe extension, click <strong>Connect NovaSafe</strong>, and complete pairing again.
        </p>

        <a
          href={buildAppUrl()}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-surface text-[14px] font-semibold text-foreground transition hover:bg-surface-2"
        >
          Go to NovaSafe web app
        </a>
      </div>
    </Section>
  );
}
