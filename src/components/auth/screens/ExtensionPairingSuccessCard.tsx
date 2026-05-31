import { ArrowRight, CheckCircle2, Puzzle } from "lucide-react";

import { PrimaryButton, Section, Title } from "@/components/auth/primitives";
import { buildAppUrl } from "@/config";

interface ExtensionPairingSuccessCardProps {
  phase: "handoff" | "success";
}

export function ExtensionPairingSuccessCard({ phase }: ExtensionPairingSuccessCardProps) {
  const appUrl = buildAppUrl();

  return (
    <Section>
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
        {phase === "handoff" ? (
          <Puzzle className="h-7 w-7 animate-pulse" />
        ) : (
          <CheckCircle2 className="h-7 w-7" />
        )}
      </div>

      <Title
        eyebrow="Extension connected"
        title={phase === "handoff" ? "Finishing connection…" : "NovaSafe Extension Connected"}
        sub={
          phase === "handoff"
            ? "Securely authorizing your browser extension. This only takes a moment."
            : "Your browser extension has been successfully connected to your NovaSafe account. You can now securely access your passwords, autofill credentials, and manage your vault directly from your browser."
        }
      />

      {phase === "success" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-[13px] leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">Open the extension</p>
            <p className="mt-1">
              Click the <strong>NovaSafe</strong> icon in your browser toolbar, then enter your master password to
              unlock your vault.
            </p>
          </div>

          <PrimaryButton type="button" onClick={() => window.close()}>
            Close this tab
          </PrimaryButton>

          <a
            href={appUrl}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-[14px] font-semibold text-foreground transition hover:bg-surface-2"
          >
            Return to NovaSafe <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      ) : null}
    </Section>
  );
}
