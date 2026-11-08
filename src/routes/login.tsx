import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { rejectAuthenticatedVisitors } from "@/lib/auth/guest-guard";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginCard } from "@/components/auth/screens/LoginCard";
import { ForgotPasswordCard } from "@/components/auth/screens/ForgotPasswordCard";
import { TwoFactorCard } from "@/components/auth/screens/TwoFactorCard";
import { buildSignupUrl } from "@/config";

/**
 * `/login` — production-grade email + password sign-in.
 *
 * The `next` and `ref` query parameters are accepted (forwarded by landing
 * CTAs and other surfaces) but neither is used to control which screen is
 * rendered — that's a property of the path itself, by design.
 */

const loginSearchSchema = z.object({
  next: z.string().url().optional().catch(undefined),
  ref: z.string().max(64).optional().catch(undefined),
});

export const Route = createFileRoute("/login")({
  ssr: false,
  beforeLoad: ({ search }) => rejectAuthenticatedVisitors(search.next),
  validateSearch: (search) => loginSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — NovaSafe" },
      {
        name: "description",
        content: "Sign in to NovaSafe. Decrypted on your device, never on our servers.",
      },
    ],
  }),
  component: LoginRoute,
});

type Stage =
  | { kind: "login" }
  | { kind: "forgot"; initialEmail?: string }
  | { kind: "two-factor"; email: string; message: string };

function LoginRoute() {
  const { next } = Route.useSearch();
  const [stage, setStage] = useState<Stage>({ kind: "login" });
  const [loginNotice, setLoginNotice] = useState<string | null>(null);

  const kicker =
    stage.kind === "login"
      ? "Welcome back"
      : stage.kind === "forgot"
        ? "Account recovery"
        : "Two-factor";
  const headline =
    stage.kind === "login"
      ? "The vault that disappears when you don't need it."
      : stage.kind === "forgot"
        ? "Recovery, the way it should be — private and effortless."
        : "A second factor that takes one second.";

  return (
    <AuthShell
      kicker={kicker}
      headline={headline}
      topBarAction={
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>New to NovaSafe?</span>
          <a
            href={buildSignupUrl()}
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            Create an account
          </a>
        </div>
      }
    >
      {stage.kind === "login" ? (
        <LoginCard
          next={next}
          loginNotice={loginNotice}
          onClearNotice={() => setLoginNotice(null)}
          onForgotPassword={(initialEmail) => setStage({ kind: "forgot", initialEmail })}
          onTwoFactorRequired={(email, message) => setStage({ kind: "two-factor", email, message })}
        />
      ) : stage.kind === "forgot" ? (
        <ForgotPasswordCard
          initialEmail={stage.initialEmail}
          onBackToLogin={() => {
            setLoginNotice(null);
            setStage({ kind: "login" });
          }}
          onComplete={(message) => {
            setLoginNotice(message);
            setStage({ kind: "login" });
          }}
        />
      ) : (
        <TwoFactorCard email={stage.email} next={next} onBack={() => setStage({ kind: "login" })} />
      )}
    </AuthShell>
  );
}
